'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms'
import { Button } from '@/components/atoms'
import { Input } from '@/components/atoms'
import { Label } from '@/components/atoms'
import { Textarea } from '@/components/atoms'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms'
import { Switch } from '@/components/atoms'
import { Badge } from '@/components/atoms'
import { Plus, X } from 'lucide-react'
import {
  toolService,
  type Tool,
  type UpdateToolRequest,
  type ParameterDef,
} from '@/service/tool'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface EditToolModalProps {
  tool: Tool
  onClose: () => void
  onSuccess: () => void
}

export function EditToolModal({
  tool,
  onClose,
  onSuccess,
}: EditToolModalProps) {
  const t = useTranslations('Tool')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)

  // 基本信息
  const [formData, setFormData] = useState({
    id: tool.id,
    name: tool.name,
    display_name: tool.display_name,
    description: tool.description,
    category: tool.category,
    type: tool.type,
    enabled: tool.enabled,
  })

  // 端点配置
  const [endpoint, setEndpoint] = useState({
    url_template: tool.endpoint.url_template,
    method: tool.endpoint.method,
    headers: Object.entries(tool.endpoint.headers || {}).map(
      ([key, value]) => ({
        key,
        value,
      })
    ),
    auth_type: tool.endpoint.auth?.type || 'none',
    token_env: tool.endpoint.auth?.token_env || '',
    timeout: tool.endpoint.timeout || 30,
  })

  // 参数定义
  const [parameters, setParameters] = useState<Record<string, ParameterDef>>(
    tool.parameters.properties || {}
  )

  // 响应转换
  const [responseTransform, setResponseTransform] = useState({
    extract: tool.response_transform?.extract || '$',
    format: tool.response_transform?.format || 'json',
  })

  // 添加请求头
  const addHeader = () => {
    setEndpoint({
      ...endpoint,
      headers: [...endpoint.headers, { key: '', value: '' }],
    })
  }

  // 删除请求头
  const removeHeader = (index: number) => {
    setEndpoint({
      ...endpoint,
      headers: endpoint.headers.filter((_, i) => i !== index),
    })
  }

  // 更新请求头
  const updateHeader = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const newHeaders = [...endpoint.headers]
    newHeaders[index][field] = value
    setEndpoint({ ...endpoint, headers: newHeaders })
  }

  // 提交更新
  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const toolData: UpdateToolRequest = {
        id: formData.id.trim(),
        name: formData.name.trim(),
        display_name: formData.display_name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        type: formData.type,
        enabled: formData.enabled,
        endpoint: {
          url_template: endpoint.url_template,
          method: endpoint.method,
          headers: Object.fromEntries(
            endpoint.headers
              .filter(h => h.key && h.value)
              .map(h => [h.key, h.value])
          ),
          timeout: endpoint.timeout,
          auth:
            endpoint.auth_type !== 'none'
              ? {
                  type: endpoint.auth_type,
                  token_env: endpoint.token_env || undefined,
                }
              : undefined,
        },
        parameters: {
          type: 'object',
          properties: parameters,
          required: Object.entries(parameters)
            .filter(([_, p]) => p.required)
            .map(([name]) => name),
        },
        response_transform: responseTransform,
        version: tool.version,
      }

      await toolService.updateTool(tool.id, toolData)
      toast.success(t('messages.updated'))
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.updateFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('editModal.title')}</DialogTitle>
          <DialogDescription>{t('editModal.description')}</DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* 进度指示 */}
          <div className='flex items-center justify-center gap-2'>
            <div
              className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`}
            />
            <div
              className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}
            />
            <div
              className={`h-2 w-16 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`}
            />
          </div>

          {step === 1 && (
            <>
              {/* 基本信息 */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>
                  {t('createModal.basicInfo')}
                </h3>

                <div className='grid gap-4'>
                  <div>
                    <Label>{t('fields.id')}</Label>
                    <Input value={formData.id} disabled className='bg-muted' />
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {t('fields.idCannotChange')}
                    </p>
                  </div>

                  <div>
                    <Label>{t('fields.name')} *</Label>
                    <Input
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>{t('fields.displayName')} *</Label>
                    <Input
                      value={formData.display_name}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          display_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>{t('fields.description')} *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label>{t('fields.category')}</Label>
                      <Select
                        value={formData.category}
                        onValueChange={value =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='web'>
                            {t('categories.web')}
                          </SelectItem>
                          <SelectItem value='api'>
                            {t('categories.api')}
                          </SelectItem>
                          <SelectItem value='database'>
                            {t('categories.database')}
                          </SelectItem>
                          <SelectItem value='custom'>
                            {t('categories.custom')}
                          </SelectItem>
                          <SelectItem value='test'>
                            {t('categories.test')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t('fields.type')}</Label>
                      <Select
                        value={formData.type}
                        onValueChange={value =>
                          setFormData({
                            ...formData,
                            type: value as 'invokable' | 'streamable',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='invokable'>Invokable</SelectItem>
                          <SelectItem value='streamable'>Streamable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='flex items-center justify-between'>
                    <Label htmlFor='enabled'>{t('fields.enabled')}</Label>
                    <Switch
                      id='enabled'
                      checked={formData.enabled}
                      onCheckedChange={checked =>
                        setFormData({ ...formData, enabled: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* 端点配置 */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>
                  {t('createModal.endpoint')}
                </h3>

                <div className='grid gap-4'>
                  <div>
                    <Label>{t('fields.url')} *</Label>
                    <Input
                      value={endpoint.url_template}
                      onChange={e =>
                        setEndpoint({
                          ...endpoint,
                          url_template: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>{t('fields.method')}</Label>
                    <Select
                      value={endpoint.method}
                      onValueChange={value =>
                        setEndpoint({ ...endpoint, method: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='GET'>GET</SelectItem>
                        <SelectItem value='POST'>POST</SelectItem>
                        <SelectItem value='PUT'>PUT</SelectItem>
                        <SelectItem value='DELETE'>DELETE</SelectItem>
                        <SelectItem value='PATCH'>PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 请求头 */}
                  <div>
                    <div className='mb-2 flex items-center justify-between'>
                      <Label>{t('fields.headers')}</Label>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={addHeader}
                      >
                        <Plus className='mr-1 size-3' />
                        {t('add')}
                      </Button>
                    </div>
                    <div className='space-y-2'>
                      {endpoint.headers.map((header, index) => (
                        <div key={index} className='flex gap-2'>
                          <Input
                            placeholder='Key'
                            value={header.key}
                            onChange={e =>
                              updateHeader(index, 'key', e.target.value)
                            }
                          />
                          <Input
                            placeholder='Value'
                            value={header.value}
                            onChange={e =>
                              updateHeader(index, 'value', e.target.value)
                            }
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeHeader(index)}
                          >
                            <X className='size-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 认证配置 */}
                  <div>
                    <Label>{t('fields.authType')}</Label>
                    <Select
                      value={endpoint.auth_type}
                      onValueChange={value =>
                        setEndpoint({ ...endpoint, auth_type: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>
                          {t('authTypes.none')}
                        </SelectItem>
                        <SelectItem value='bearer'>Bearer Token</SelectItem>
                        <SelectItem value='api_key'>API Key</SelectItem>
                        <SelectItem value='basic'>Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {endpoint.auth_type === 'bearer' && (
                    <div>
                      <Label>{t('fields.tokenEnv')}</Label>
                      <Input
                        placeholder='MY_API_TOKEN'
                        value={endpoint.token_env}
                        onChange={e =>
                          setEndpoint({
                            ...endpoint,
                            token_env: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div>
                    <Label>{t('fields.timeout')}</Label>
                    <Input
                      type='number'
                      value={endpoint.timeout}
                      onChange={e =>
                        setEndpoint({
                          ...endpoint,
                          timeout: parseInt(e.target.value) || 30,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {/* 参数配置 */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>
                  {t('createModal.parameters')}
                </h3>

                {/* 参数列表（只读展示） */}
                {Object.keys(parameters).length > 0 ? (
                  <div className='space-y-2'>
                    {Object.entries(parameters).map(([name, param]) => (
                      <div
                        key={name}
                        className='flex items-center gap-3 rounded-lg border p-3'
                      >
                        <Badge variant='outline'>{param.type}</Badge>
                        <div className='flex-1'>
                          <div className='font-medium'>
                            {name}
                            {param.required && (
                              <span className='ml-1 text-red-500'>*</span>
                            )}
                          </div>
                          {param.description && (
                            <div className='text-sm text-muted-foreground'>
                              {param.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    {t('noParameters')}
                  </p>
                )}

                <hr />

                {/* 响应转换 */}
                <h3 className='text-lg font-semibold'>
                  {t('createModal.response')}
                </h3>

                <div className='grid gap-4'>
                  <div>
                    <Label>{t('fields.extractPath')}</Label>
                    <Input
                      placeholder='$.data'
                      value={responseTransform.extract}
                      onChange={e =>
                        setResponseTransform({
                          ...responseTransform,
                          extract: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>{t('fields.responseFormat')}</Label>
                    <Select
                      value={responseTransform.format}
                      onValueChange={value =>
                        setResponseTransform({
                          ...responseTransform,
                          format: value as any,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='json'>JSON</SelectItem>
                        <SelectItem value='text'>Text</SelectItem>
                        <SelectItem value='markdown'>Markdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className='flex items-center justify-between border-t pt-4'>
          <Button
            type='button'
            variant='ghost'
            onClick={onClose}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>

          <div className='flex gap-2'>
            {step > 1 && (
              <Button
                type='button'
                variant='outline'
                onClick={() => setStep(step - 1)}
                disabled={isLoading}
              >
                {t('previous')}
              </Button>
            )}
            {step < 3 ? (
              <Button
                type='button'
                onClick={() => setStep(step + 1)}
                disabled={isLoading}
              >
                {t('next')}
              </Button>
            ) : (
              <Button type='button' onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
