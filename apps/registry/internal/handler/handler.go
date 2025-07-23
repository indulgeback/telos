package handler

import (
	"fmt"
	"net/http"

	"github.com/indulgeback/telos/apps/registry/internal/service"

	"github.com/labstack/echo/v4"
)

// RegistryHandler 注册中心 HTTP 处理器
type RegistryHandler struct {
	discovery service.ServiceDiscoveryInterface
}

// NewRegistryHandler 创建注册中心处理器
func NewRegistryHandler(discovery service.ServiceDiscoveryInterface) *RegistryHandler {
	return &RegistryHandler{
		discovery: discovery,
	}
}

// RegisterService 注册服务
func (h *RegistryHandler) RegisterService(c echo.Context) error {
	var serviceInfo service.ServiceInfo
	if err := c.Bind(&serviceInfo); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "请求参数无效",
		})
	}

	// 验证必填字段
	if serviceInfo.Name == "" || serviceInfo.Address == "" || serviceInfo.Port == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "服务名称、地址和端口为必填项",
		})
	}

	// 生成服务ID（如果未提供）
	if serviceInfo.ID == "" {
		serviceInfo.ID = fmt.Sprintf("%s-%s-%d", serviceInfo.Name, serviceInfo.Address, serviceInfo.Port)
	}

	err := h.discovery.Register(&serviceInfo)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("注册服务失败: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "服务注册成功",
		"service": serviceInfo,
	})
}

// UnregisterService 注销服务
func (h *RegistryHandler) UnregisterService(c echo.Context) error {
	serviceID := c.Param("id")
	if serviceID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "服务ID不能为空",
		})
	}

	err := h.discovery.Unregister(serviceID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("注销服务失败: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "服务注销成功",
	})
}

// ListServices 获取服务列表
func (h *RegistryHandler) ListServices(c echo.Context) error {
	serviceName := c.QueryParam("name")
	if serviceName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "服务名称不能为空",
		})
	}

	instances, err := h.discovery.ListInstances(serviceName)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("获取服务列表失败: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"services": instances,
		"count":    len(instances),
	})
}

// DiscoverService 发现服务
func (h *RegistryHandler) DiscoverService(c echo.Context) error {
	serviceName := c.Param("name")
	if serviceName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "服务名称不能为空",
		})
	}

	instance, err := h.discovery.Discover(serviceName)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": fmt.Sprintf("发现服务失败: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"service": instance,
	})
}

// HealthCheck 健康检查
func (h *RegistryHandler) HealthCheck(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"status": "healthy",
	})
}

// GetServiceStats 获取服务统计信息
func (h *RegistryHandler) GetServiceStats(c echo.Context) error {
	// 这里可以添加更多统计信息，如服务数量、健康状态等
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":  "running",
		"version": "1.0.0",
	})
}
