'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import { useRouter, usePathname } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'
import appConfig from '@/appConfig'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Separator,
  Alert,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/atoms'
import {
  agentService,
  type McpApprovalPolicy,
  type McpServer,
  type McpTransport,
} from '@/service/agent'
import { toast } from 'sonner'
import {
  Loader2,
  Pencil,
  Plus,
  Server,
  Trash2,
  WandSparkles,
  Palette,
  Shield,
  AlertTriangle,
  Mail,
  User,
  Calendar,
  Globe,
  Bell,
  Check,
  Laptop,
  Smartphone,
} from 'lucide-react'

interface SystemSettingsModalProps {
  onClose: () => void
}

interface McpFormState {
  name: string
  description: string
  transport: McpTransport
  command: string
  argsText: string
  url: string
  envText: string
  approvalPolicy: McpApprovalPolicy
  enabled: boolean
}

const parseArgs = (value: string): string[] =>
  value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

const parseEnv = (value: string): Record<string, string> => {
  const env: Record<string, string> = {}

  value
    .split('\n')
    .map(line => line.trim())
    .forEach(line => {
      if (!line) return

      const separatorIndex = line.indexOf('=')
      if (separatorIndex <= 0) return

      const key = line.slice(0, separatorIndex).trim()
      const envValue = line.slice(separatorIndex + 1).trim()
      if (!key) return

      env[key] = envValue
    })

  return env
}

const buildFormFromServer = (server: McpServer): McpFormState => {
  const envEntries =
    server.env && typeof server.env === 'object'
      ? Object.entries(server.env).filter((item): item is [string, string] => {
          return typeof item[1] === 'string'
        })
      : []

  return {
    name: server.name,
    description: server.description ?? '',
    transport: server.transport,
    command: server.command ?? '',
    argsText: Array.isArray(server.args) ? server.args.join('\n') : '',
    url: server.url ?? '',
    envText: envEntries.map(([key, value]) => `${key}=${value}`).join('\n'),
    approvalPolicy: server.approval_policy,
    enabled: server.enabled,
  }
}

export function SystemSettingsModal({ onClose }: SystemSettingsModalProps) {
  const t = useTranslations('SystemSettings')
  const tmcp = useTranslations('McpSettings')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()

  // 1. Session 数据
  const { data: session } = authClient.useSession()
  const user = session?.user
  const [accounts, setAccounts] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const loadSessions = useCallback(() => {
    if (!user) return
    setSessionsLoading(true)
    authClient
      .listSessions()
      .then(res => {
        if (Array.isArray(res)) {
          setSessions(res)
        } else if (res && 'data' in res && Array.isArray(res.data)) {
          setSessions(res.data)
        }
      })
      .catch(err => console.error('Failed to list sessions:', err))
      .finally(() => setSessionsLoading(false))
  }, [user])

  useEffect(() => {
    if (user) {
      loadSessions()
      authClient
        .listAccounts()
        .then(res => {
          if (Array.isArray(res)) {
            setAccounts(res)
          } else if (res && 'data' in res && Array.isArray(res.data)) {
            setAccounts(res.data)
          }
        })
        .catch(err => console.error('Failed to list accounts:', err))
    }
  }, [user, loadSessions])

  const handleRevokeSession = async (token: string) => {
    try {
      await authClient.revokeSession({ token })
      toast.success(t('messages.revokeSuccess'))
      loadSessions()
    } catch (err) {
      console.error('Failed to revoke session:', err)
      toast.error(t('messages.revokeError'))
    }
  }

  const parseUserAgent = (ua: string) => {
    if (!ua) return { os: t('ua.unknownOS'), browser: t('ua.unknownBrowser') }
    const uaLower = ua.toLowerCase()
    let os = 'Unknown OS'
    let browser = 'Unknown Browser'

    if (uaLower.includes('windows')) os = 'Windows'
    else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
      if (uaLower.includes('iphone') || uaLower.includes('ipad')) os = 'iOS'
      else os = 'macOS'
    } else if (uaLower.includes('android')) os = 'Android'
    else if (uaLower.includes('linux')) os = 'Linux'

    if (uaLower.includes('firefox')) browser = 'Firefox'
    else if (uaLower.includes('chrome') && !uaLower.includes('chromium'))
      browser = 'Chrome'
    else if (uaLower.includes('safari') && !uaLower.includes('chrome'))
      browser = 'Safari'
    else if (uaLower.includes('edge')) browser = 'Edge'
    else if (uaLower.includes('opera') || uaLower.includes('opr'))
      browser = 'Opera'

    return { os, browser }
  }

  // 2. Preferences 状态
  const [notifications, setNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pref_push_notifications') !== 'false'
    }
    return true
  })

  const [emailUpdates, setEmailUpdates] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pref_email_updates') !== 'false'
    }
    return true
  })

  const handlePushChange = (val: boolean) => {
    setNotifications(val)
    localStorage.setItem('pref_push_notifications', String(val))
    toast.success(t('messages.pushUpdateSuccess'))
  }

  const handleEmailChange = (val: boolean) => {
    setEmailUpdates(val)
    localStorage.setItem('pref_email_updates', String(val))
    toast.success(t('messages.emailUpdateSuccess'))
  }

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
    toast.success(t('messages.langUpdateSuccess'))
  }

  const getLocaleName = (code: string) => {
    const localeNames: Record<string, string> = {
      en: 'English',
      zh: '简体中文',
      tw: '繁體中文',
      ko: '한국어',
      ja: '日本語',
      de: 'Deutsch',
      ru: 'Русский',
    }
    return localeNames[code] || code
  }

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      github: 'GitHub',
      google: 'Google',
      discord: 'Discord',
      slack: 'Slack',
      credential: t('account.magicLinkProvider'),
    }
    return names[provider] || provider
  }

  // 3. MCP Servers 状态与逻辑
  const [mcpLoading, setMcpLoading] = useState(false)
  const [mcpSubmitting, setMcpSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [servers, setServers] = useState<McpServer[]>([])
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testingResult, setTestingResult] = useState<Record<string, number>>({})
  const [mcpForm, setMcpForm] = useState<McpFormState>({
    name: '',
    description: '',
    transport: 'stdio',
    command: '',
    argsText: '',
    url: '',
    envText: '',
    approvalPolicy: 'none',
    enabled: true,
  })

  const loadServers = useCallback(async () => {
    setMcpLoading(true)
    try {
      const result = await agentService.listMcpServers()
      setServers(result)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tmcp('errors.loadFailed')
      )
    } finally {
      setMcpLoading(false)
    }
  }, [tmcp])

  useEffect(() => {
    loadServers()
  }, [loadServers])

  const resetMcpForm = () => {
    setMcpForm({
      name: '',
      description: '',
      transport: 'stdio',
      command: '',
      argsText: '',
      url: '',
      envText: '',
      approvalPolicy: 'none',
      enabled: true,
    })
  }

  const openMcpCreate = () => {
    setEditingId('new')
    resetMcpForm()
  }

  const openMcpEdit = (server: McpServer) => {
    setEditingId(server.id)
    setMcpForm(buildFormFromServer(server))
  }

  const buildMcpPayload = (): Omit<
    McpServer,
    'id' | 'created_at' | 'updated_at'
  > => {
    return {
      name: mcpForm.name.trim(),
      description: mcpForm.description.trim(),
      transport: mcpForm.transport,
      command:
        mcpForm.transport === 'stdio' ? mcpForm.command.trim() : undefined,
      args: parseArgs(mcpForm.argsText),
      url: mcpForm.transport === 'stdio' ? undefined : mcpForm.url.trim(),
      env: parseEnv(mcpForm.envText),
      enabled: mcpForm.enabled,
      approval_policy: mcpForm.approvalPolicy,
    }
  }

  const validateMcp = () => {
    if (!mcpForm.name.trim()) {
      toast.error(tmcp('validation.nameRequired'))
      return false
    }
    if (!mcpForm.description.trim()) {
      toast.error(tmcp('validation.descriptionRequired'))
      return false
    }
    if (mcpForm.transport === 'stdio' && !mcpForm.command.trim()) {
      toast.error(tmcp('validation.commandRequired'))
      return false
    }
    if (mcpForm.transport !== 'stdio' && !mcpForm.url.trim()) {
      toast.error(tmcp('validation.urlRequired'))
      return false
    }
    return true
  }

  const handleMcpSubmit = async () => {
    if (!validateMcp() || !editingId) return

    setMcpSubmitting(true)
    try {
      const payload = buildMcpPayload()

      if (editingId === 'new') {
        await agentService.createMcpServer(payload)
        toast.success(tmcp('messages.created'))
      } else {
        await agentService.updateMcpServer(editingId, payload)
        toast.success(tmcp('messages.updated'))
      }

      setEditingId(null)
      resetMcpForm()
      await loadServers()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tmcp('errors.saveFailed')
      )
    } finally {
      setMcpSubmitting(false)
    }
  }

  const handleMcpDelete = async (id: string) => {
    if (!confirm(tmcp('messages.deleteConfirm'))) return

    try {
      await agentService.deleteMcpServer(id)
      toast.success(tmcp('messages.deleted'))
      await loadServers()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tmcp('errors.deleteFailed')
      )
    }
  }

  const handleMcpTest = async (server: McpServer) => {
    setTestingId(server.id)
    try {
      const result = await agentService.testMcpServer(server.id)
      const count = result.tools?.length ?? 0
      setTestingResult(prev => ({ ...prev, [server.id]: count }))
      toast.success(tmcp('messages.testSuccess', { count }))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tmcp('errors.testFailed')
      )
    } finally {
      setTestingId(null)
    }
  }

  // 4. 危险操作
  const handleDeleteAccount = async () => {
    if (!confirm(t('danger.deleteConfirm'))) return
    toast.error(t('danger.deleteNotice'))
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[90vw] h-[80vh] p-0 overflow-hidden flex flex-col md:flex-row border-border/60 shadow-2xl'>
        <Tabs
          defaultValue='preferences'
          className='flex flex-col md:flex-row w-full h-full'
        >
          {/* 左侧 Tab 栏导航 */}
          <div className='w-full md:w-60 bg-muted/20 border-r border-border/60 p-5 flex flex-col shrink-0 h-full justify-between'>
            <div className='space-y-6'>
              <div className='mb-6 px-2'>
                <DialogTitle className='text-lg font-bold tracking-tight text-foreground'>
                  {t('title')}
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground/85 mt-1'>
                  {t('description')}
                </DialogDescription>
              </div>

              <TabsList className='flex flex-col w-full bg-transparent h-auto gap-1 items-stretch p-0 justify-start'>
                <TabsTrigger
                  value='preferences'
                  className='justify-start gap-2.5 px-3 py-2 text-left rounded-md transition-all duration-200 w-full hover:bg-muted/40 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm'
                >
                  <Palette className='size-4 text-muted-foreground' />
                  {t('tabs.preferences')}
                </TabsTrigger>
                <TabsTrigger
                  value='account'
                  className='justify-start gap-2.5 px-3 py-2 text-left rounded-md transition-all duration-200 w-full hover:bg-muted/40 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm'
                >
                  <Shield className='size-4 text-muted-foreground' />
                  {t('tabs.account')}
                </TabsTrigger>
                <TabsTrigger
                  value='mcp'
                  className='justify-start gap-2.5 px-3 py-2 text-left rounded-md transition-all duration-200 w-full hover:bg-muted/40 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm'
                >
                  <Server className='size-4 text-muted-foreground' />
                  {t('tabs.mcp')}
                </TabsTrigger>
                <TabsTrigger
                  value='danger'
                  className='justify-start gap-2.5 px-3 py-2 text-left rounded-md transition-all duration-200 w-full hover:bg-red-500/10 text-red-600 dark:text-red-400 data-[state=active]:bg-red-500/10 dark:data-[state=active]:bg-red-500/20'
                >
                  <AlertTriangle className='size-4' />
                  {t('tabs.danger')}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className='text-[10px] text-muted-foreground/60 px-2 mt-auto hidden md:block'>
              {t('modalTitle')}
            </div>
          </div>

          {/* 右侧主配置内容区 */}
          <div className='flex-1 overflow-y-auto p-8 bg-background/50 h-full'>
            {/* Tab 1: 应用偏好设置 */}
            <TabsContent
              value='preferences'
              className='space-y-6 outline-none mt-0'
            >
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-1'>
                    <Label
                      htmlFor='pref-dark-mode'
                      className='text-sm font-semibold'
                    >
                      {t('preferences.themeLabel')}
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      {t('preferences.themeDesc')}
                    </p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className='w-[140px] rounded-full shadow-none border-foreground/10 bg-background/40'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='system'>
                        {tCommon('theme.system')}
                      </SelectItem>
                      <SelectItem value='light'>
                        {tCommon('theme.light')}
                      </SelectItem>
                      <SelectItem value='dark'>
                        {tCommon('theme.dark')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className='flex items-center justify-between'>
                  <div className='space-y-1'>
                    <Label
                      htmlFor='pref-lang'
                      className='text-sm font-semibold'
                    >
                      {t('preferences.langLabel')}
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      {t('preferences.langDesc')}
                    </p>
                  </div>
                  <Select value={locale} onValueChange={handleLocaleChange}>
                    <SelectTrigger className='w-[140px] rounded-full shadow-none border-foreground/10 bg-background/40'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {appConfig.locales.map(loc => (
                        <SelectItem key={loc} value={loc}>
                          {getLocaleName(loc)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className='flex items-center justify-between'>
                  <div className='space-y-1'>
                    <Label
                      htmlFor='pref-push'
                      className='text-sm font-semibold'
                    >
                      {t('preferences.pushLabel')}
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      {t('preferences.pushDesc')}
                    </p>
                  </div>
                  <Switch
                    id='pref-push'
                    checked={notifications}
                    onCheckedChange={handlePushChange}
                  />
                </div>

                <Separator />

                <div className='flex items-center justify-between'>
                  <div className='space-y-1'>
                    <Label
                      htmlFor='pref-email'
                      className='text-sm font-semibold'
                    >
                      {t('preferences.emailLabel')}
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      {t('preferences.emailDesc')}
                    </p>
                  </div>
                  <Switch
                    id='pref-email'
                    checked={emailUpdates}
                    onCheckedChange={handleEmailChange}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: 账户与安全 */}
            <TabsContent
              value='account'
              className='space-y-6 outline-none mt-0'
            >
              <div className='space-y-4'>
                <div className='flex items-center gap-4 bg-muted/20 p-4 rounded-xl border border-foreground/5'>
                  <Avatar className='h-16 w-16 shadow-inner'>
                    <AvatarImage
                      src={user?.image || ''}
                      alt={user?.name || ''}
                    />
                    <AvatarFallback className='text-lg bg-background text-foreground border border-foreground/5'>
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='space-y-1'>
                    <h3 className='text-md font-semibold text-foreground'>
                      {user?.name || t('account.notSetName')}
                    </h3>
                    <p className='text-xs text-muted-foreground flex items-center gap-1.5'>
                      <Mail className='h-3.5 w-3.5' />
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'>
                  <div className='space-y-1.5 p-3 rounded-lg border bg-background/25 border-foreground/5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      {t('account.name')}
                    </label>
                    <p className='text-sm font-medium text-foreground'>
                      {user?.name || t('account.notConfigured')}
                    </p>
                  </div>
                  <div className='space-y-1.5 p-3 rounded-lg border bg-background/25 border-foreground/5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      {t('account.email')}
                    </label>
                    <p className='text-sm font-medium text-foreground'>
                      {user?.email || t('account.notConfigured')}
                    </p>
                  </div>
                  <div className='space-y-1.5 p-3 rounded-lg border bg-background/25 border-foreground/5 md:col-span-2'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      {t('account.id')}
                    </label>
                    <p className='text-xs font-mono text-muted-foreground/80 truncate'>
                      {user?.id}
                    </p>
                  </div>
                  <div className='space-y-1.5 p-3 rounded-lg border bg-background/25 border-foreground/5 md:col-span-2 flex items-center justify-between'>
                    <div>
                      <label className='text-xs font-semibold text-muted-foreground'>
                        {t('account.method')}
                      </label>
                      <p className='text-xs text-muted-foreground'>
                        {t('account.methodDesc')}
                      </p>
                    </div>
                    {accounts && accounts.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {accounts.map(acc => (
                          <Badge
                            key={acc.id}
                            variant='outline'
                            className='rounded-full border-foreground/10 bg-background/40 px-3 py-1'
                          >
                            {getProviderName(acc.providerId)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge
                        variant='outline'
                        className='rounded-full border-foreground/10 bg-background/40 px-3 py-1'
                      >
                        {t('account.authMethod')}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className='space-y-3'>
                  <Label className='text-sm font-semibold'>
                    {t('account.activeSessions')}
                  </Label>
                  <div className='rounded-lg border border-foreground/5 bg-muted/5 divide-y divide-foreground/5 overflow-hidden'>
                    {sessionsLoading ? (
                      <div className='p-4 text-center text-xs text-muted-foreground/80'>
                        {t('account.loadingSessions')}
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className='p-4 text-center text-xs text-muted-foreground/80'>
                        {t('account.noSessions')}
                      </div>
                    ) : (
                      sessions.map(s => {
                        const isCurrent = s.id === session?.session?.id
                        const { os, browser } = parseUserAgent(s.userAgent)
                        const isMobile = os === 'iOS' || os === 'Android'

                        return (
                          <div
                            key={s.id}
                            className='flex items-center justify-between p-3.5'
                          >
                            <div className='flex items-center gap-3 min-w-0'>
                              <div className='flex size-8 items-center justify-center rounded-lg bg-background border border-foreground/5 text-muted-foreground shrink-0'>
                                {isMobile ? (
                                  <Smartphone className='size-4' />
                                ) : (
                                  <Laptop className='size-4' />
                                )}
                              </div>
                              <div className='min-w-0'>
                                <p className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                                  {browser} on {os}
                                  {isCurrent && (
                                    <span className='inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-500 border border-emerald-500/10 shrink-0'>
                                      {t('account.currentDevice')}
                                    </span>
                                  )}
                                </p>
                                <p className='text-[10px] text-muted-foreground mt-0.5 truncate'>
                                  IP: {s.ipAddress || t('account.unknown')} ·{' '}
                                  {t('account.createdAt')}{' '}
                                  {s.createdAt
                                    ? new Date(s.createdAt).toLocaleDateString()
                                    : t('account.unknown')}
                                </p>
                              </div>
                            </div>
                            {!isCurrent && (
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleRevokeSession(s.token)}
                                className='rounded-full text-[10px] h-7 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 transition-colors'
                              >
                                {t('account.revokeBtn')}
                              </Button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: MCP 插件服务绑定 */}
            <TabsContent value='mcp' className='space-y-4 outline-none mt-0'>
              {editingId === null ? (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-xs text-muted-foreground'>
                      {tmcp('serverCount', { count: servers.length })}
                    </span>
                    <Button
                      type='button'
                      size='sm'
                      onClick={openMcpCreate}
                      className='shrink-0 rounded-full'
                    >
                      <Plus className='mr-1.5 size-4' />
                      {tmcp('add')}
                    </Button>
                  </div>

                  {mcpLoading ? (
                    <div className='flex justify-center py-12'>
                      <Loader2 className='size-6 animate-spin text-muted-foreground' />
                    </div>
                  ) : servers.length === 0 ? (
                    <div className='rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground bg-muted/5'>
                      {tmcp('empty')}
                    </div>
                  ) : (
                    <div className='space-y-3 max-h-[50vh] overflow-y-auto pr-1'>
                      {servers.map(server => {
                        const isTesting = testingId === server.id
                        const tested = testingResult[server.id]

                        return (
                          <div
                            key={server.id}
                            className='rounded-xl border p-3.5 space-y-2 bg-background/30 hover:bg-background/65 border-foreground/5 transition-all duration-200'
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <div className='space-y-1.5'>
                                <div className='flex items-center gap-2'>
                                  <Server className='size-4 text-muted-foreground/80' />
                                  <span className='font-medium text-sm'>
                                    {server.name}
                                  </span>
                                  <Badge
                                    variant={
                                      server.enabled ? 'default' : 'outline'
                                    }
                                    className='text-[10px] px-1.5 py-0.5 rounded-full scale-90'
                                  >
                                    {server.enabled
                                      ? tmcp('enabled')
                                      : tmcp('disabled')}
                                  </Badge>
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                  {server.description}
                                </p>
                                <div className='flex flex-wrap gap-1.5 text-[10px]'>
                                  <Badge
                                    variant='outline'
                                    className='scale-90 origin-left'
                                  >
                                    {server.transport}
                                  </Badge>
                                  <Badge
                                    variant='secondary'
                                    className='scale-90 origin-left'
                                  >
                                    {tmcp(
                                      `approvalPolicy.${server.approval_policy}`
                                    )}
                                  </Badge>
                                  {tested !== undefined && (
                                    <Badge className='scale-90 origin-left bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-transparent'>
                                      {tmcp('lastTest', { count: tested })}
                                    </Badge>
                                  )}
                                </div>
                                <div className='text-[11px] text-muted-foreground/80 font-mono select-all truncate max-w-[450px]'>
                                  {server.transport === 'stdio'
                                    ? `Command: ${server.command}`
                                    : `URL: ${server.url}`}
                                </div>
                              </div>

                              <div className='flex shrink-0 items-center gap-1.5'>
                                <Button
                                  size='icon'
                                  variant='ghost'
                                  className='size-8 rounded-full hover:bg-background/80'
                                  onClick={() => openMcpEdit(server)}
                                  aria-label={tmcp('edit')}
                                >
                                  <Pencil className='size-3.5 text-muted-foreground' />
                                </Button>

                                <Button
                                  size='icon'
                                  variant='ghost'
                                  className='size-8 rounded-full hover:bg-background/80'
                                  onClick={() => handleMcpTest(server)}
                                  disabled={isTesting}
                                  aria-label={tmcp('test')}
                                >
                                  {isTesting ? (
                                    <Loader2 className='size-3.5 animate-spin text-muted-foreground' />
                                  ) : (
                                    <WandSparkles className='size-3.5 text-muted-foreground' />
                                  )}
                                </Button>

                                <Button
                                  size='icon'
                                  variant='ghost'
                                  className='size-8 rounded-full text-red-500 hover:bg-red-500/10'
                                  onClick={() => handleMcpDelete(server.id)}
                                  aria-label={tmcp('delete')}
                                >
                                  <Trash2 className='size-3.5' />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='text-sm font-semibold border-b pb-2 text-foreground'>
                    {editingId === 'new'
                      ? tmcp('createTitle')
                      : tmcp('editTitle')}
                  </div>

                  <div className='grid gap-4 md:grid-cols-2 max-h-[48vh] overflow-y-auto pr-1'>
                    <div className='space-y-1.5 md:col-span-1'>
                      <Label
                        htmlFor='mcp-name'
                        className='text-xs font-semibold'
                      >
                        {tmcp('fields.name')}
                      </Label>
                      <Input
                        id='mcp-name'
                        placeholder={tmcp('placeholders.name')}
                        value={mcpForm.name}
                        onChange={event =>
                          setMcpForm({ ...mcpForm, name: event.target.value })
                        }
                      />
                    </div>

                    <div className='space-y-1.5 md:col-span-1'>
                      <Label
                        htmlFor='mcp-transport'
                        className='text-xs font-semibold'
                      >
                        {tmcp('fields.transport')}
                      </Label>
                      <Select
                        value={mcpForm.transport}
                        onValueChange={value =>
                          setMcpForm({
                            ...mcpForm,
                            transport: value as McpTransport,
                          })
                        }
                      >
                        <SelectTrigger
                          id='mcp-transport'
                          className='rounded-md'
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='stdio'>
                            {tmcp('transportValues.stdio')}
                          </SelectItem>
                          <SelectItem value='streamable_http'>
                            {tmcp('transportValues.streamable_http')}
                          </SelectItem>
                          <SelectItem value='sse'>
                            {tmcp('transportValues.sse')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1.5 md:col-span-2'>
                      <Label
                        htmlFor='mcp-description'
                        className='text-xs font-semibold'
                      >
                        {tmcp('fields.description')}
                      </Label>
                      <Textarea
                        id='mcp-description'
                        rows={2}
                        value={mcpForm.description}
                        onChange={event =>
                          setMcpForm({
                            ...mcpForm,
                            description: event.target.value,
                          })
                        }
                        placeholder={tmcp('placeholders.description')}
                      />
                    </div>

                    {mcpForm.transport === 'stdio' ? (
                      <>
                        <div className='space-y-1.5 md:col-span-2'>
                          <Label
                            htmlFor='mcp-command'
                            className='text-xs font-semibold'
                          >
                            {tmcp('fields.command')}
                          </Label>
                          <Input
                            id='mcp-command'
                            value={mcpForm.command}
                            onChange={event =>
                              setMcpForm({
                                ...mcpForm,
                                command: event.target.value,
                              })
                            }
                            placeholder={tmcp('placeholders.command')}
                          />
                        </div>
                        <div className='space-y-1.5 md:col-span-2'>
                          <Label
                            htmlFor='mcp-args'
                            className='text-xs font-semibold'
                          >
                            {tmcp('fields.args')}
                          </Label>
                          <Textarea
                            id='mcp-args'
                            rows={2}
                            value={mcpForm.argsText}
                            onChange={event =>
                              setMcpForm({
                                ...mcpForm,
                                argsText: event.target.value,
                              })
                            }
                            placeholder={tmcp('placeholders.args')}
                          />
                        </div>
                      </>
                    ) : (
                      <div className='space-y-1.5 md:col-span-2'>
                        <Label
                          htmlFor='mcp-url'
                          className='text-xs font-semibold'
                        >
                          {tmcp('fields.url')}
                        </Label>
                        <Input
                          id='mcp-url'
                          value={mcpForm.url}
                          onChange={event =>
                            setMcpForm({ ...mcpForm, url: event.target.value })
                          }
                          placeholder={tmcp('placeholders.url')}
                        />
                      </div>
                    )}

                    <div className='space-y-1.5 md:col-span-2'>
                      <Label
                        htmlFor='mcp-env'
                        className='text-xs font-semibold'
                      >
                        {tmcp('fields.env')}
                      </Label>
                      <Textarea
                        id='mcp-env'
                        rows={2}
                        value={mcpForm.envText}
                        onChange={event =>
                          setMcpForm({
                            ...mcpForm,
                            envText: event.target.value,
                          })
                        }
                        placeholder={tmcp('placeholders.env')}
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='mcp-policy'
                        className='text-xs font-semibold'
                      >
                        {tmcp('fields.approvalPolicy')}
                      </Label>
                      <Select
                        value={mcpForm.approvalPolicy}
                        onValueChange={value =>
                          setMcpForm({
                            ...mcpForm,
                            approvalPolicy: value as McpApprovalPolicy,
                          })
                        }
                      >
                        <SelectTrigger id='mcp-policy'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='none'>
                            {tmcp('approval.none')}
                          </SelectItem>
                          <SelectItem value='all'>
                            {tmcp('approval.all')}
                          </SelectItem>
                          <SelectItem value='sensitive'>
                            {tmcp('approval.sensitive')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex items-center justify-between pt-2 px-1'>
                      <Label
                        htmlFor='mcp-enabled'
                        className='text-xs font-semibold'
                      >
                        {tmcp('fields.enabled')}
                      </Label>
                      <Switch
                        id='mcp-enabled'
                        checked={mcpForm.enabled}
                        onCheckedChange={value =>
                          setMcpForm({ ...mcpForm, enabled: value })
                        }
                      />
                    </div>
                  </div>

                  <div className='flex justify-end gap-2 border-t pt-4 mt-2'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setEditingId(null)}
                    >
                      {tmcp('cancel')}
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      onClick={handleMcpSubmit}
                      disabled={mcpSubmitting}
                    >
                      {mcpSubmitting ? (
                        <>
                          <Loader2 className='mr-1.5 size-4 animate-spin' />
                          {tmcp('saving')}
                        </>
                      ) : editingId === 'new' ? (
                        tmcp('create')
                      ) : (
                        tmcp('update')
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 4: 危险操作 */}
            <TabsContent value='danger' className='space-y-6 outline-none mt-0'>
              <div className='space-y-4'>
                <div className='space-y-1.5'>
                  <h3 className='text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5'>
                    <AlertTriangle className='size-4' />
                    {t('danger.title')}
                  </h3>
                  <p className='text-xs text-muted-foreground'>
                    {t('danger.desc')}
                  </p>
                </div>

                <Alert
                  variant='destructive'
                  className='border-red-500/20 bg-red-500/5 rounded-xl'
                >
                  <AlertTriangle className='h-4 w-4 text-red-600 dark:text-red-400' />
                  <p className='text-xs leading-relaxed text-red-700 dark:text-red-300'>
                    {t('danger.alertText')}
                  </p>
                </Alert>

                <div className='pt-2'>
                  <Button
                    variant='destructive'
                    className='rounded-full px-5'
                    onClick={handleDeleteAccount}
                  >
                    {t('danger.deleteBtn')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
