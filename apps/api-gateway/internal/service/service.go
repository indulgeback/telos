package service

// ServiceDiscovery 服务发现接口
type ServiceDiscovery interface {
	Discover(serviceName string) (string, error)
}

// LoadBalancer 负载均衡接口
type LoadBalancer interface {
	Select(instances []string) string
}
