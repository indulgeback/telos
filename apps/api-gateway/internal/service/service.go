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
		refreshIntvl: 30 * time.Second, // 默认30秒刷新一次
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

func (r *RegistryServiceDiscovery) refreshAllServices() {
	// 这里可以维护一个服务名列表，或每次刷新时动态获取
	// 简单实现：假设有一组常用服务名
	serviceNames := []string{"user-service", "auth-service", "workflow-service"}
	for _, name := range serviceNames {
		instances := r.FetchInstances(name)
		r.cacheLock.Lock()
		r.cache[name] = instances
		r.cacheLock.Unlock()
		tlog.Info("服务发现刷新", "service", name, "instances", instances, "count", len(instances))
	}
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
	return r.LB.Select(instances), nil
}

// LoadBalancer 负载均衡接口
// Select 根据策略从实例列表中选择一个

type LoadBalancer interface {
	Select(instances []string) string
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

func (r *RoundRobinLoadBalancer) Select(instances []string) string {
	if len(instances) == 0 {
		return ""
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	key := "default"
	idx := r.index[key]
	selected := instances[idx%len(instances)]
	r.index[key] = (idx + 1) % len(instances)
	return selected
}
