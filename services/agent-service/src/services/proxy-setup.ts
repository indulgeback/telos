/**
 * HTTP 代理全局初始化。
 *
 * 部署环境（如国内服务器）无法直连部分海外 API（Google 等）时，
 * 通过 HTTPS_PROXY/HTTP_PROXY 指定正向代理（如宿主机 mihomo/Clash）。
 *
 * Node 原生 fetch（undici）默认不读代理环境变量，这里在启动时设置
 * EnvHttpProxyAgent 作为全局 dispatcher：
 * - HTTPS_PROXY / HTTP_PROXY：需走代理的目标
 * - NO_PROXY：直连白名单（内网服务名 + 国内 API 域名）
 * 未配置代理变量时完全不介入，零影响。
 */
import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici'
import { logger } from '../config/logger.js'

const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy

if (proxyUrl) {
  setGlobalDispatcher(new EnvHttpProxyAgent())
  logger.info({
    msg: 'Global HTTP proxy enabled for fetch',
    proxy: proxyUrl,
    noProxy: process.env.NO_PROXY || process.env.no_proxy || '(unset: all hosts go through proxy)',
  })
}
