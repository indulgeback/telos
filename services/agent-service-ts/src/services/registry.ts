import { config, logger } from '../config/index.js'

// 服务注册信息接口（与 Go 版本保持一致）
export interface ServiceInfo {
  name: string
  address: string
  port: number
  tags: string[]
  meta?: Record<string, string>
}

// 服务注册响应接口
export interface RegistryResponse {
  success: boolean
  message?: string
}

/**
 * 获取本地服务地址
 * 优先使用环境变量 SERVICE_ADDRESS，否则自动检测
 * 对应 Go 版本: pkg/netutil/local_ip.go:GetLocalIP()
 */
async function getLocalAddress(): Promise<string> {
  // 优先从环境变量读取
  if (config.serviceAddress) {
    return config.serviceAddress
  }

  // 自动检测本地IP（非回环地址）
  try {
    const os = await import('node:os')
    const interfaces = os.networkInterfaces()
    for (const name in interfaces) {
      const networkInterface = interfaces[name]
      if (!networkInterface) continue
      for (const iface of networkInterface) {
        // IPv4 且非回环地址
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
  } catch (error) {
    logger.warn({
      msg: 'Failed to auto-detect IP, using localhost',
      err: error,
    })
  }

  // localhost 时返回 127.0.0.1（与 Go 版本一致）
  return '127.0.0.1'
}

/**
 * 注册服务到注册中心
 * 对应 Go 版本: cmd/main.go:registerToRegistry()
 *
 * @param serviceName 服务名称
 * @param address 服务地址
 * @param port 服务端口
 * @param registryURL 注册中心URL
 */
export async function registerToRegistry(
  serviceName: string,
  address: string,
  port: number
): Promise<void> {
  // 构建服务注册信息（与 Go 版本保持一致）
  const serviceInfo: ServiceInfo = {
    name: serviceName,
    address,
    port,
    tags: ['api', serviceName],
    meta: { version: '1.0.0' },
  }

  try {
    const body = JSON.stringify(serviceInfo)
    const response = await fetch(`http://${address}:8891/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })

    // 检查注册响应
    if (response.status === 200) {
      logger.info({
        msg: 'Service registered successfully',
        service: serviceName,
        address,
        port,
      })
    } else {
      logger.error({
        msg: 'Service registration response abnormal',
        statusCode: response.status,
        service: serviceName,
      })
    }
  } catch (error) {
    logger.error({
      msg: 'Service registration failed',
      service: serviceName,
      err: error,
    })
  }
}

/**
 * 获取服务注册地址
 * 对应 Go 版本: pkg/netutil/local_ip.go:GetServiceAddress()
 */
export async function getServiceAddress(): Promise<string> {
  return getLocalAddress()
}

/**
 * 获取健康检查 URL
 * 对应 Go 版本: pkg/netutil/local_ip.go:GetHealthCheckURL()
 */
export async function getHealthCheckURL(
  path: string = '/health'
): Promise<string> {
  const address = await getLocalAddress()
  const port = config.port

  // 确保使用 127.0.0.1 而不是 localhost
  const effectiveAddress = address === 'localhost' ? '127.0.0.1' : address
  return `http://${effectiveAddress}:${port}${path}`
}

/**
 * 执行服务注册
 * 在服务启动后调用
 */
export async function performRegistration(): Promise<void> {
  const serviceAddr = await getServiceAddress()
  logger.info({
    msg: 'Detected service address',
    address: serviceAddr,
  })

  await registerToRegistry(config.serviceName, serviceAddr, config.port)
}
