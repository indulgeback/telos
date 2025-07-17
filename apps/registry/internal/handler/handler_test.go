package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	. "registry/internal/service"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

// MockServiceDiscovery 简化的模拟服务发现
type MockServiceDiscovery struct {
	services map[string][]*ServiceInfo
}

func NewMockServiceDiscovery() *MockServiceDiscovery {
	return &MockServiceDiscovery{
		services: make(map[string][]*ServiceInfo),
	}
}

func (m *MockServiceDiscovery) Register(service *ServiceInfo) error {
	if m.services[service.Name] == nil {
		m.services[service.Name] = []*ServiceInfo{}
	}
	m.services[service.Name] = append(m.services[service.Name], service)
	return nil
}

func (m *MockServiceDiscovery) Unregister(serviceID string) error {
	// 简化实现
	return nil
}

func (m *MockServiceDiscovery) ListInstances(serviceName string) ([]*ServiceInfo, error) {
	return m.services[serviceName], nil
}

func (m *MockServiceDiscovery) Discover(serviceName string) (*ServiceInfo, error) {
	instances := m.services[serviceName]
	if len(instances) == 0 {
		return nil, assert.AnError
	}
	return instances[0], nil
}

func (m *MockServiceDiscovery) WatchService(serviceName string, callback func([]*ServiceInfo)) {
	// 简化实现
}

func TestRegisterService(t *testing.T) {
	e := echo.New()
	mockDiscovery := NewMockServiceDiscovery()
	h := NewRegistryHandler(mockDiscovery)

	// 测试成功注册
	requestBody := map[string]interface{}{
		"name":    "test-service",
		"address": "localhost",
		"port":    8080,
		"tags":    []string{"api"},
	}

	body, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := h.RegisterService(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)
	assert.Equal(t, "服务注册成功", response["message"])
}

func TestRegisterServiceMissingFields(t *testing.T) {
	e := echo.New()
	mockDiscovery := NewMockServiceDiscovery()
	h := NewRegistryHandler(mockDiscovery)

	// 测试缺少必填字段
	requestBody := map[string]interface{}{
		"name": "test-service",
		// 缺少 address 和 port
	}

	body, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := h.RegisterService(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)
	assert.Equal(t, "服务名称、地址和端口为必填项", response["error"])
}

func TestHealthCheck(t *testing.T) {
	e := echo.New()
	mockDiscovery := NewMockServiceDiscovery()
	h := NewRegistryHandler(mockDiscovery)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := h.HealthCheck(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var response map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &response)
	assert.Equal(t, "healthy", response["status"])
}
