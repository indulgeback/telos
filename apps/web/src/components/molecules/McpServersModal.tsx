'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
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
} from 'lucide-react'

interface McpServersModalProps {
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

export function McpServersModal({ onClose }: McpServersModalProps) {
  const t = useTranslations('McpSettings')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [servers, setServers] = useState<McpServer[]>([])
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testingResult, setTestingResult] = useState<Record<string, number>>({})
  const [form, setForm] = useState<McpFormState>({
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
    setIsLoading(true)
    try {
      const result = await agentService.listMcpServers()
      setServers(result)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('errors.loadFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadServers()
  }, [loadServers])

  const resetForm = () => {
    setForm({
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

  const openCreate = () => {
    setEditingId('new')
    resetForm()
  }

  const openEdit = (server: McpServer) => {
    setEditingId(server.id)
    setForm(buildFormFromServer(server))
  }

  const buildPayload = (): Omit<
    McpServer,
    'id' | 'created_at' | 'updated_at'
  > => {
    return {
      name: form.name.trim(),
      description: form.description.trim(),
      transport: form.transport,
      command: form.transport === 'stdio' ? form.command.trim() : undefined,
      args: parseArgs(form.argsText),
      url: form.transport === 'stdio' ? undefined : form.url.trim(),
      env: parseEnv(form.envText),
      enabled: form.enabled,
      approval_policy: form.approvalPolicy,
    }
  }

  const validate = () => {
    if (!form.name.trim()) {
      toast.error(t('validation.nameRequired'))
      return false
    }

    if (!form.description.trim()) {
      toast.error(t('validation.descriptionRequired'))
      return false
    }

    if (form.transport === 'stdio' && !form.command.trim()) {
      toast.error(t('validation.commandRequired'))
      return false
    }

    if (form.transport !== 'stdio' && !form.url.trim()) {
      toast.error(t('validation.urlRequired'))
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validate() || !editingId) return

    setIsSubmitting(true)
    try {
      const payload = buildPayload()

      if (editingId === 'new') {
        await agentService.createMcpServer(payload)
        toast.success(t('messages.created'))
      } else {
        await agentService.updateMcpServer(editingId, payload)
        toast.success(t('messages.updated'))
      }

      setEditingId(null)
      resetForm()
      await loadServers()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('errors.saveFailed')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('messages.deleteConfirm'))) return

    try {
      await agentService.deleteMcpServer(id)
      toast.success(t('messages.deleted'))
      await loadServers()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('errors.deleteFailed')
      )
    }
  }

  const handleTest = async (server: McpServer) => {
    setTestingId(server.id)
    try {
      const result = await agentService.testMcpServer(server.id)
      const count = result.tools?.length ?? 0
      setTestingResult(prev => ({ ...prev, [server.id]: count }))
      toast.success(t('messages.testSuccess', { count }))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('errors.testFailed')
      )
    } finally {
      setTestingId(null)
    }
  }

  const currentMode = editingId ? 'form' : 'list'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='max-w-3xl max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {currentMode === 'list' ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between gap-3'>
              <span className='text-sm text-muted-foreground'>
                {t('serverCount', { count: servers.length })}
              </span>
              <Button type='button' onClick={openCreate} className='shrink-0'>
                <Plus className='mr-2 size-4' />
                {t('add')}
              </Button>
            </div>

            {isLoading ? (
              <div className='flex justify-center py-10'>
                <Loader2 className='size-8 animate-spin text-muted-foreground' />
              </div>
            ) : servers.length === 0 ? (
              <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
                {t('empty')}
              </div>
            ) : (
              <div className='space-y-2'>
                {servers.map(server => {
                  const isTesting = testingId === server.id
                  const tested = testingResult[server.id]

                  return (
                    <div
                      key={server.id}
                      className='rounded-lg border p-3 space-y-2'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-2'>
                            <Server className='size-4 text-muted-foreground' />
                            <span className='font-medium'>{server.name}</span>
                            <Badge
                              variant={server.enabled ? 'default' : 'outline'}
                              className='text-xs'
                            >
                              {server.enabled ? t('enabled') : t('disabled')}
                            </Badge>
                          </div>
                          <p className='text-sm text-muted-foreground'>
                            {server.description}
                          </p>
                          <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                            <Badge variant='outline'>{server.transport}</Badge>
                            <Badge variant='secondary'>
                              {t(`approvalPolicy.${server.approval_policy}`)}
                            </Badge>
                            {tested !== undefined && (
                              <Badge>{t('lastTest', { count: tested })}</Badge>
                            )}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {server.transport === 'stdio'
                              ? `${t('transportHint.stdio')}：${server.command}`
                              : `${t('transportHint.network')}：${server.url}`}
                          </div>
                        </div>

                        <div className='flex shrink-0 items-center gap-2'>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => openEdit(server)}
                            aria-label={t('edit')}
                          >
                            <Pencil className='size-4' />
                          </Button>

                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => handleTest(server)}
                            disabled={isTesting}
                            aria-label={t('test')}
                          >
                            {isTesting ? (
                              <Loader2 className='size-4 animate-spin' />
                            ) : (
                              <WandSparkles className='size-4' />
                            )}
                          </Button>

                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => handleDelete(server.id)}
                            aria-label={t('delete')}
                          >
                            <Trash2 className='size-4' />
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
            <div className='text-sm font-medium'>
              {editingId === 'new' ? t('createTitle') : t('editTitle')}
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-1 md:col-span-1'>
                <Label htmlFor='mcp-name'>{t('fields.name')}</Label>
                <Input
                  id='mcp-name'
                  placeholder={t('placeholders.name')}
                  value={form.name}
                  onChange={event =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </div>

              <div className='space-y-1 md:col-span-1'>
                <Label htmlFor='mcp-transport'>{t('fields.transport')}</Label>
                <Select
                  value={form.transport}
                  onValueChange={value =>
                    setForm({ ...form, transport: value as McpTransport })
                  }
                >
                  <SelectTrigger id='mcp-transport'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='stdio'>
                      {t('transportValues.stdio')}
                    </SelectItem>
                    <SelectItem value='streamable_http'>
                      {t('transportValues.streamable_http')}
                    </SelectItem>
                    <SelectItem value='sse'>
                      {t('transportValues.sse')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1 md:col-span-2'>
                <Label htmlFor='mcp-description'>
                  {t('fields.description')}
                </Label>
                <Textarea
                  id='mcp-description'
                  rows={3}
                  value={form.description}
                  onChange={event =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder={t('placeholders.description')}
                />
              </div>

              {form.transport === 'stdio' ? (
                <>
                  <div className='space-y-1 md:col-span-2'>
                    <Label htmlFor='mcp-command'>{t('fields.command')}</Label>
                    <Input
                      id='mcp-command'
                      value={form.command}
                      onChange={event =>
                        setForm({ ...form, command: event.target.value })
                      }
                      placeholder={t('placeholders.command')}
                    />
                  </div>
                  <div className='space-y-1 md:col-span-2'>
                    <Label htmlFor='mcp-args'>{t('fields.args')}</Label>
                    <Textarea
                      id='mcp-args'
                      rows={3}
                      value={form.argsText}
                      onChange={event =>
                        setForm({ ...form, argsText: event.target.value })
                      }
                      placeholder={t('placeholders.args')}
                    />
                  </div>
                </>
              ) : (
                <div className='space-y-1 md:col-span-2'>
                  <Label htmlFor='mcp-url'>{t('fields.url')}</Label>
                  <Input
                    id='mcp-url'
                    value={form.url}
                    onChange={event =>
                      setForm({ ...form, url: event.target.value })
                    }
                    placeholder={t('placeholders.url')}
                  />
                </div>
              )}

              <div className='space-y-1 md:col-span-2'>
                <Label htmlFor='mcp-env'>{t('fields.env')}</Label>
                <Textarea
                  id='mcp-env'
                  rows={3}
                  value={form.envText}
                  onChange={event =>
                    setForm({ ...form, envText: event.target.value })
                  }
                  placeholder={t('placeholders.env')}
                />
              </div>

              <div className='space-y-1'>
                <Label htmlFor='mcp-policy'>{t('fields.approvalPolicy')}</Label>
                <Select
                  value={form.approvalPolicy}
                  onValueChange={value =>
                    setForm({
                      ...form,
                      approvalPolicy: value as McpApprovalPolicy,
                    })
                  }
                >
                  <SelectTrigger id='mcp-policy'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>{t('approval.none')}</SelectItem>
                    <SelectItem value='all'>{t('approval.all')}</SelectItem>
                    <SelectItem value='sensitive'>
                      {t('approval.sensitive')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex items-center justify-between pt-2'>
                <Label htmlFor='mcp-enabled'>{t('fields.enabled')}</Label>
                <Switch
                  id='mcp-enabled'
                  checked={form.enabled}
                  onCheckedChange={value =>
                    setForm({ ...form, enabled: value })
                  }
                />
              </div>
            </div>

            <div className='flex justify-end gap-2 border-t pt-4'>
              <Button
                type='button'
                variant='ghost'
                onClick={() => setEditingId(null)}
              >
                {t('cancel')}
              </Button>
              <Button
                type='button'
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    {t('saving')}
                  </>
                ) : editingId === 'new' ? (
                  t('create')
                ) : (
                  t('update')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
