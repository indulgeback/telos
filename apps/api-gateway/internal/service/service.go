package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/indulgeback/telos/pkg/tlog"
)

// ServiceDiscovery 服务发现接口
// 只定义服务注册、注销、实例列表和发现方法
// Register/Unregister 生产环境可留空

type ServiceDiscovery interface {
	startAutoRefresh()
	refreshAllServices()
	FetchInstances(serviceName string) []string
	ListInstances(serviceName string) []string
	Discover(serviceName string) (string, error)
	InvalidateCache(serviceName string)
}

// RegistryServiceDiscovery 通过 registry 服务发现
// 生产环境推荐使用

type RegistryServiceDiscovery struct {
	RegistryAddr string // registry服务地址，如 http://localhost:8080
	LB           LoadBalancer

	cache        map[string][]string // 服务名 -> 实例列表
	cacheLock    sync.RWMutex
	refreshIntvl time.Duration
	stopCh       chan struct{}
}

func NewRegistryServiceDiscovery(registryAddr string, lb LoadBalancer) *RegistryServiceDiscovery {
	rsd := &RegistryServiceDiscovery{
		RegistryAddr: registryAddr,
		LB:           lb,
		cache:        make(map[string][]string),
		refreshIntvl: 10 * time.Second, // 默认10秒刷新一次
		stopCh:       make(chan struct{}),
	}
	rsd.refreshAllServices()
	go rsd.startAutoRefresh()
	return rsd
}

func (r *RegistryServiceDiscovery) startAutoRefresh() {
	ticker := time.NewTicker(r.refreshIntvl)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			r.refreshAllServices()
		case <-r.stopCh:
			return
		}
	}
}

func (r *RegistryServiceDiscovery) FetchAllServiceNames() []string {
	url := fmt.Sprintf("%s/api/services", r.RegistryAddr)
	resp, err := http.Get(url)
	if err != nil {
		tlog.Error("获取服务列表失败", "error", err, "url", url)
		return nil
	}
	defer resp.Body.Close()

	var result struct {
		Services []string `json:"services"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		tlog.Error("解析服务列表失败", "error", err)
		return nil
	}
	return result.Services
}

func (r *RegistryServiceDiscovery) refreshAllServices() {
	serviceNames := r.FetchAllServiceNames()
	if len(serviceNames) == 0 {
		serviceNames = []string{"agent-service"}
	}
	r.cacheLock.Lock()
	defer r.cacheLock.Unlock()

	activeServices := make(map[string]bool)
	for _, name := range serviceNames {
		activeServices[name] = true
		instances := r.FetchInstances(name)
		r.cache[name] = instances
		tlog.Info("服务发现刷新", "service", name, "instances", instances, "count", len(instances))
	}

	for k := range r.cache {
		if !activeServices[k] {
			delete(r.cache, k)
		}
	}
}

func (r *RegistryServiceDiscovery) InvalidateCache(serviceName string) {
	tlog.Info("主动失效服务实例缓存并触发刷新", "service", serviceName)
	instances := r.FetchInstances(serviceName)
	r.cacheLock.Lock()
	r.cache[serviceName] = instances
	r.cacheLock.Unlock()
}

func (r *RegistryServiceDiscovery) FetchInstances(serviceName string) []string {
	url := fmt.Sprintf("%s/api/service?name=%s", r.RegistryAddr, serviceName)
	resp, err := http.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	var result struct {
		Services []struct {
			ID      string            `json:"id"`
			Name    string            `json:"name"`
			Address string            `json:"address"`
			Port    int               `json:"port"`
			Tags    []string          `json:"tags"`
			Meta    map[string]string `json:"meta"`
			Status  string            `json:"status"`
		} `json:"services"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil
	}
	var addrs []string
	for _, s := range result.Services {
		if s.Status == "passing" || s.Status == "" {
			addrs = append(addrs, fmt.Sprintf("%s:%d", s.Address, s.Port))
		}
	}
	return addrs
}

func (r *RegistryServiceDiscovery) ListInstances(serviceName string) []string {
	r.cacheLock.RLock()
	instances, ok := r.cache[serviceName]
	r.cacheLock.RUnlock()
	if ok && len(instances) > 0 {
		return instances
	}
	// 缓存没有则立即拉取一次
	instances = r.FetchInstances(serviceName)
	r.cacheLock.Lock()
	r.cache[serviceName] = instances
	r.cacheLock.Unlock()
	return instances
}

func (r *RegistryServiceDiscovery) Discover(serviceName string) (string, error) {
	instances := r.ListInstances(serviceName)
	if len(instances) == 0 {
		return "", errors.New("无可用实例")
	}
	return r.LB.Select(serviceName, instances), nil
}

// LoadBalancer 负载均衡接口
// Select 根据策略从实例列表中选择一个

type LoadBalancer interface {
	Select(serviceName string, instances []string) string
}

// RoundRobinLoadBalancer 轮询负载均衡实现

type RoundRobinLoadBalancer struct {
	mu    sync.Mutex
	index map[string]int
}

func NewRoundRobinLoadBalancer() *RoundRobinLoadBalancer {
	return &RoundRobinLoadBalancer{
		index: make(map[string]int),
	}
}

func (r *RoundRobinLoadBalancer) Select(serviceName string, instances []string) string {
	if len(instances) == 0 {
		return ""
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	key := serviceName
	idx := r.index[key]
	selected := instances[idx%len(instances)]
	r.index[key] = (idx + 1) % len(instances)
	return selected
}
