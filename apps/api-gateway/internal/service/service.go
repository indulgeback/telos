package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
)

// ServiceDiscovery 服务发现接口
// 只定义服务注册、注销、实例列表和发现方法
// Register/Unregister 生产环境可留空

type ServiceDiscovery interface {
	Register(serviceName, address string)
	Unregister(serviceName, address string)
	ListInstances(serviceName string) []string
	Discover(serviceName string) (string, error)
}

// RegistryServiceDiscovery 通过 registry 服务发现
// 生产环境推荐使用

type RegistryServiceDiscovery struct {
	RegistryAddr string // registry服务地址，如 http://localhost:8080
	LB           LoadBalancer
}

func NewRegistryServiceDiscovery(registryAddr string, lb LoadBalancer) *RegistryServiceDiscovery {
	return &RegistryServiceDiscovery{
		RegistryAddr: registryAddr,
		LB:           lb,
	}
}

func (r *RegistryServiceDiscovery) Register(serviceName, address string) {
	// 生产环境 gateway 不负责注册服务
}

func (r *RegistryServiceDiscovery) Unregister(serviceName, address string) {
	// 生产环境 gateway 不负责注销服务
}

func (r *RegistryServiceDiscovery) ListInstances(serviceName string) []string {
	url := fmt.Sprintf("%s/api/services?name=%s", r.RegistryAddr, serviceName)
	resp, err := http.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	var result struct {
		Services []struct {
			ID      string `json:"id"`
			Name    string `json:"name"`
			Address string `json:"address"`
			Port    int    `json:"port"`
			Status  string `json:"status"`
		} `json:"services"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil
	}
	var addrs []string
	for _, s := range result.Services {
		if s.Status == "passing" || s.Status == "" { // 兼容健康实例
			addrs = append(addrs, fmt.Sprintf("%s:%d", s.Address, s.Port))
		}
	}
	return addrs
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
