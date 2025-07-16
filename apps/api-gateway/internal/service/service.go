package service

import (
	"errors"
	"sync"
)

// ServiceDiscovery 服务发现接口，定义服务注册、注销、实例列表和发现方法
// 可用于动态管理和查找后端服务实例
// Discover 返回一个可用实例地址
// Register/Unregister 用于动态注册和注销实例
// ListInstances 返回所有实例

type ServiceDiscovery interface {
	// Register 注册服务实例
	Register(serviceName, address string)
	// Unregister 注销服务实例
	Unregister(serviceName, address string)
	// ListInstances 获取所有实例
	ListInstances(serviceName string) []string
	// Discover 发现一个可用实例（通常结合负载均衡）
	Discover(serviceName string) (string, error)
}

// LoadBalancer 负载均衡接口，定义实例选择策略
// Select 根据策略从实例列表中选择一个

type LoadBalancer interface {
	// Select 从实例列表中选择一个实例
	Select(instances []string) string
}

// MemoryServiceDiscovery 内存实现的服务发现
// 适合开发测试或小型场景，生产建议用注册中心

type MemoryServiceDiscovery struct {
	mu        sync.RWMutex        // 读写锁，保证并发安全
	instances map[string][]string // 服务名 -> 实例地址列表
	lb        LoadBalancer        // 负载均衡器
}

// NewMemoryServiceDiscovery 创建内存服务发现实例
func NewMemoryServiceDiscovery(lb LoadBalancer) *MemoryServiceDiscovery {
	return &MemoryServiceDiscovery{
		instances: make(map[string][]string),
		lb:        lb,
	}
}

// Register 注册服务实例
func (m *MemoryServiceDiscovery) Register(serviceName, address string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.instances[serviceName] = append(m.instances[serviceName], address)
}

// Unregister 注销服务实例
func (m *MemoryServiceDiscovery) Unregister(serviceName, address string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	addrs := m.instances[serviceName]
	for i, v := range addrs {
		if v == address {
			m.instances[serviceName] = append(addrs[:i], addrs[i+1:]...)
			break
		}
	}
}

// ListInstances 获取所有实例
func (m *MemoryServiceDiscovery) ListInstances(serviceName string) []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	// 返回副本，避免外部修改内部数据
	return append([]string{}, m.instances[serviceName]...)
}

// Discover 发现一个可用实例（结合负载均衡策略）
func (m *MemoryServiceDiscovery) Discover(serviceName string) (string, error) {
	instances := m.ListInstances(serviceName)
	if len(instances) == 0 {
		return "", errors.New("无可用实例")
	}
	return m.lb.Select(instances), nil
}

// RoundRobinLoadBalancer 轮询负载均衡实现
// 每次调用 Select 都会顺序返回下一个实例，实现简单均衡分发

type RoundRobinLoadBalancer struct {
	mu    sync.Mutex     // 保证多协程下索引安全
	index map[string]int // 服务名 -> 当前轮询索引
}

// NewRoundRobinLoadBalancer 创建轮询负载均衡器
func NewRoundRobinLoadBalancer() *RoundRobinLoadBalancer {
	return &RoundRobinLoadBalancer{
		index: make(map[string]int),
	}
}

// Select 轮询选择一个实例
func (r *RoundRobinLoadBalancer) Select(instances []string) string {
	if len(instances) == 0 {
		return ""
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	key := "default" // 如需多服务可用 serviceName 做 key
	idx := r.index[key]
	selected := instances[idx%len(instances)]
	r.index[key] = (idx + 1) % len(instances)
	return selected
}
