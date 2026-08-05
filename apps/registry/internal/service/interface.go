package service

// ServiceDiscoveryInterface 服务发现接口
type ServiceDiscoveryInterface interface {
	Register(service *ServiceInfo) error
	Unregister(serviceID string) error
	ListInstances(serviceName string) ([]*ServiceInfo, error)
	ListServiceNames() ([]string, error)
}
