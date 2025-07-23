package service

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/indulgeback/telos/apps/registry/internal/config"

	consulapi "github.com/hashicorp/consul/api"
)

// ServiceInfo 服务信息
type ServiceInfo struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Address string            `json:"address"`
	Port    int               `json:"port"`
	Tags    []string          `json:"tags"`
	Meta    map[string]string `json:"meta"`
	Status  string            `json:"status"`
}

// ConsulServiceDiscovery Consul 服务发现实现
type ConsulServiceDiscovery struct {
	client *consulapi.Client
	mu     sync.RWMutex
	cfg    *config.Config
}

// 确保 ConsulServiceDiscovery 实现了 ServiceDiscoveryInterface 接口
var _ ServiceDiscoveryInterface = (*ConsulServiceDiscovery)(nil)

// NewConsulServiceDiscovery 创建 Consul 服务发现实例
func NewConsulServiceDiscovery(cfg *config.Config) (*ConsulServiceDiscovery, error) {
	config := consulapi.DefaultConfig()
	config.Address = cfg.ConsulAddress
	if cfg.ConsulToken != "" {
		config.Token = cfg.ConsulToken
	}
	if cfg.ConsulDC != "" {
		config.Datacenter = cfg.ConsulDC
	}

	client, err := consulapi.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("创建 Consul 客户端失败: %v", err)
	}

	return &ConsulServiceDiscovery{
		client: client,
		cfg:    cfg,
	}, nil
}

// Register 注册服务实例
func (c *ConsulServiceDiscovery) Register(service *ServiceInfo) error {
	registration := &consulapi.AgentServiceRegistration{
		ID:      service.ID,
		Name:    service.Name,
		Address: service.Address,
		Port:    service.Port,
		Tags:    service.Tags,
		Meta:    service.Meta,
		Check: &consulapi.AgentServiceCheck{
			HTTP:                           fmt.Sprintf("http://%s:%d/health", service.Address, service.Port),
			Interval:                       "10s",
			DeregisterCriticalServiceAfter: "30s",
		},
	}

	err := c.client.Agent().ServiceRegister(registration)
	if err != nil {
		return fmt.Errorf("注册服务失败: %v", err)
	}

	log.Printf("服务注册成功: %s (%s:%d)", service.Name, service.Address, service.Port)
	return nil
}

// Unregister 注销服务实例
func (c *ConsulServiceDiscovery) Unregister(serviceID string) error {
	err := c.client.Agent().ServiceDeregister(serviceID)
	if err != nil {
		return fmt.Errorf("注销服务失败: %v", err)
	}

	log.Printf("服务注销成功: %s", serviceID)
	return nil
}

// ListInstances 获取服务实例列表
func (c *ConsulServiceDiscovery) ListInstances(serviceName string) ([]*ServiceInfo, error) {
	services, _, err := c.client.Health().Service(serviceName, "", true, nil)
	if err != nil {
		return nil, fmt.Errorf("获取服务实例失败: %v", err)
	}

	var instances []*ServiceInfo
	for _, service := range services {
		instance := &ServiceInfo{
			ID:      service.Service.ID,
			Name:    service.Service.Service,
			Address: service.Service.Address,
			Port:    service.Service.Port,
			Tags:    service.Service.Tags,
			Meta:    service.Service.Meta,
			Status:  service.Checks.AggregatedStatus(),
		}
		instances = append(instances, instance)
	}

	return instances, nil
}

// Discover 发现一个可用实例
func (c *ConsulServiceDiscovery) Discover(serviceName string) (*ServiceInfo, error) {
	instances, err := c.ListInstances(serviceName)
	if err != nil {
		return nil, err
	}

	if len(instances) == 0 {
		return nil, fmt.Errorf("服务 %s 无可用实例", serviceName)
	}

	// 简单返回第一个可用实例（后续可扩展负载均衡）
	for _, instance := range instances {
		if instance.Status == "passing" {
			return instance, nil
		}
	}

	return nil, fmt.Errorf("服务 %s 无健康实例", serviceName)
}

// WatchService 监听服务变化
func (c *ConsulServiceDiscovery) WatchService(serviceName string, callback func([]*ServiceInfo)) {
	go func() {
		var lastIndex uint64
		for {
			services, meta, err := c.client.Health().Service(serviceName, "", true, &consulapi.QueryOptions{
				WaitIndex: lastIndex,
				WaitTime:  time.Minute,
			})
			if err != nil {
				log.Printf("监听服务变化失败: %v", err)
				time.Sleep(time.Second * 5)
				continue
			}

			if meta.LastIndex == lastIndex {
				continue
			}
			lastIndex = meta.LastIndex

			var instances []*ServiceInfo
			for _, service := range services {
				instance := &ServiceInfo{
					ID:      service.Service.ID,
					Name:    service.Service.Service,
					Address: service.Service.Address,
					Port:    service.Service.Port,
					Tags:    service.Service.Tags,
					Meta:    service.Service.Meta,
					Status:  service.Checks.AggregatedStatus(),
				}
				instances = append(instances, instance)
			}

			callback(instances)
		}
	}()
}
