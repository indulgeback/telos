package service

import (
	"fmt"
	"sync"

	"github.com/indulgeback/telos/apps/registry/internal/config"

	"github.com/fatih/color"
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

	color.New(color.FgGreen).Printf("服务注册成功: %s (%s:%d)\n", service.Name, service.Address, service.Port)
	return nil
}

// Unregister 注销服务实例
func (c *ConsulServiceDiscovery) Unregister(serviceID string) error {
	err := c.client.Agent().ServiceDeregister(serviceID)
	if err != nil {
		return fmt.Errorf("注销服务失败: %v", err)
	}

	color.New(color.FgYellow).Printf("服务注销成功: %s\n", serviceID)
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

// ListServiceNames 获取所有服务名
func (c *ConsulServiceDiscovery) ListServiceNames() ([]string, error) {
	services, _, err := c.client.Catalog().Services(nil)
	if err != nil {
		return nil, fmt.Errorf("获取服务名失败: %v", err)
	}
	var names []string
	for name := range services {
		names = append(names, name)
	}
	return names, nil
}
