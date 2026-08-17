/**
 * Next.js 服务端初始化钩子（server 启动时执行一次）。
 *
 * 为服务端 fetch（Better-Auth 的 GitHub/Google OAuth 回调、Resend 邮件 API 等
 * 海外出站调用）挂全局 HTTP 代理：
 * - Node 原生 fetch（undici）默认不读 HTTPS_PROXY 环境变量，需显式设置
 *   EnvHttpProxyAgent 为全局 dispatcher
 * - 仅在配置了 HTTPS_PROXY 时启用；NO_PROXY 名单内的目标（内网服务/COS/国内
 *   API）仍直连
 * - 未配置代理时零介入，不影响本地开发
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy
  if (!proxyUrl) return

  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import('undici')
  setGlobalDispatcher(new EnvHttpProxyAgent())
  console.log(
    `[instrumentation] HTTP proxy enabled for server fetch: ${proxyUrl}`
  )
}
