# 安全配置指南

本文档说明如何为 Telos 平台配置安全设置，确保在生产环境中的安全性。

## 环境变量配置

### 必需的安全环境变量

```bash
# NextAuth 安全配置
AUTH_SECRET="your-secure-32-character-secret-key-here"  # 至少32个字符的随机字符串
NEXTAUTH_URL="https://yourdomain.com"                   # 生产环境必须使用 HTTPS

# OAuth 提供者配置
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# 安全配置
NEXT_PUBLIC_SECURE_COOKIES="true"                       # 生产环境启用安全 Cookie
NEXT_PUBLIC_FORCE_HTTPS="true"                         # 生产环境强制 HTTPS
NEXT_PUBLIC_DOMAIN="yourdomain.com"                    # 不含协议的域名
```

### 生成安全密钥

使用 NextAuth CLI 生成安全的 AUTH_SECRET：

```bash
npx auth secret
```

或者使用 OpenSSL：

```bash
openssl rand -base64 32
```

## 安全功能

### 1. CSRF 保护

- ✅ 自动启用 CSRF 令牌验证
- ✅ 状态参数验证
- ✅ 安全的 Cookie 配置

### 2. Cookie 安全

- ✅ HttpOnly Cookie（防止 XSS）
- ✅ Secure Cookie（HTTPS 环境）
- ✅ SameSite=Lax（CSRF 保护）
- ✅ 适当的 Cookie 域设置

### 3. 会话管理

- ✅ JWT 策略（无状态）
- ✅ 7天会话过期时间
- ✅ 24小时自动刷新

### 4. OAuth 权限最小化

- ✅ GitHub: `read:user user:email`
- ✅ Google: `openid email profile`

### 5. 安全头设置

- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Content-Security-Policy（CSP）
- ✅ Strict-Transport-Security（HSTS）

### 6. HTTPS 强制

- ✅ 生产环境自动重定向到 HTTPS
- ✅ HSTS 头设置（1年有效期）

## 部署检查清单

### 生产环境部署前检查

- [ ] AUTH_SECRET 已设置为安全的随机字符串（至少32字符）
- [ ] NEXTAUTH_URL 使用 HTTPS 协议
- [ ] NEXT_PUBLIC_SECURE_COOKIES 设置为 "true"
- [ ] NEXT_PUBLIC_FORCE_HTTPS 设置为 "true"
- [ ] NEXT_PUBLIC_DOMAIN 设置为正确的域名
- [ ] OAuth 应用配置了正确的回调 URL
- [ ] SSL/TLS 证书已正确配置
- [ ] 防火墙规则已配置

### OAuth 回调 URL 配置

#### GitHub OAuth App

```
https://yourdomain.com/api/auth/callback/github
```

#### Google OAuth 2.0 Client

```
https://yourdomain.com/api/auth/callback/google
```

## 安全监控

### 日志记录

系统会自动记录以下安全事件：

- 用户登录/登出
- 认证失败
- OAuth 错误
- 安全配置验证警告

### 监控指标

建议监控以下指标：

- 认证成功率
- 认证失败率
- 会话持续时间
- 异常登录尝试

## 故障排除

### 常见安全配置问题

1. **Cookie 无法设置**
   - 检查 HTTPS 配置
   - 验证域名设置
   - 确认 Secure Cookie 配置

2. **CSRF 令牌错误**
   - 检查 SameSite 设置
   - 验证域名匹配
   - 确认 HTTPS 配置

3. **OAuth 回调失败**
   - 验证回调 URL 配置
   - 检查 OAuth 应用设置
   - 确认权限范围配置

4. **会话过期问题**
   - 检查会话时长配置
   - 验证 JWT 设置
   - 确认时钟同步

### 安全配置验证

运行以下命令验证安全配置：

```bash
# 开发环境
npm run dev

# 检查控制台输出的安全配置警告
```

系统会在启动时自动验证安全配置并输出警告信息。

## 最佳实践

1. **定期更新密钥**
   - 定期轮换 AUTH_SECRET
   - 更新 OAuth 应用密钥
   - 监控密钥泄露

2. **监控安全事件**
   - 设置异常登录告警
   - 监控认证失败率
   - 记录安全相关日志

3. **保持依赖更新**
   - 定期更新 NextAuth.js
   - 更新安全相关依赖
   - 关注安全公告

4. **备份和恢复**
   - 备份环境变量配置
   - 准备应急响应计划
   - 测试恢复流程

## 联系支持

如果遇到安全配置问题，请：

1. 检查本文档的故障排除部分
2. 查看系统日志和错误信息
3. 联系技术支持团队
