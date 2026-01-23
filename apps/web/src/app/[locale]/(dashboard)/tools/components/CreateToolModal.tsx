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
  type CreateToolRequest,
  type ParameterDef,
  type ToolType,
  type AuthType,
} from '@/service/tool'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateToolModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function CreateToolModal({ onClose, onSuccess }: CreateToolModalProps) {
  const t = useTranslations('Tool')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)

  // 基本信息
  const [formData, setFormData] = useState<{
    id: string
    name: string
    display_name: string
    description: string
    category: string
    type: ToolType
    enabled: boolean
  }>({
    id: '',
    name: '',
    display_name: '',
    description: '',
    category: 'custom',
    type: 'invokable',
    enabled: true,
  })

  // 端点配置
  const [endpoint, setEndpoint] = useState<{
    url_template: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers: { key: string; value: string }[]
    auth_type: AuthType
    token_env: string
    timeout: number
  }>({
    url_template: '',
    method: 'GET',
    headers: [],
    auth_type: 'none',
    token_env: '',
    timeout: 30,
  })

  // 参数定义
  const [parameters, setParameters] = useState<Record<string, ParameterDef>>({})
  const [newParam, setNewParam] = useState({
    name: '',
    type: 'string',
    description: '',
    required: false,
  })

  // 响应转换
  const [responseTransform, setResponseTransform] = useState({
    extract: '$',
    format: 'json' as const,
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

  // 添加参数
  const addParameter = () => {
    if (!newParam.name.trim()) return

    setParameters({
      ...parameters,
      [newParam.name]: {
        type: newParam.type,
        description: newParam.description,
        required: newParam.required,
      },
    })

    setNewParam({ name: '', type: 'string', description: '', required: false })
  }

  // 删除参数
  const removeParameter = (name: string) => {
    const newParams = { ...parameters }
    delete newParams[name]
    setParameters(newParams)
  }

  // 验证第一步
  const validateStep1 = () => {
    if (!formData.id.trim()) {
      toast.error(t('validation.idRequired'))
      return false
    }
    if (!formData.name.trim()) {
      toast.error(t('validation.nameRequired'))
      return false
    }
    if (!formData.display_name.trim()) {
      toast.error(t('validation.displayNameRequired'))
      return false
    }
    return true
  }

  // 验证第二步
  const validateStep2 = () => {
    if (!endpoint.url_template.trim()) {
      toast.error(t('validation.urlRequired'))
      return false
    }
    return true
  }

  // 提交创建
  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return

    setIsLoading(true)
    try {
      const toolData: CreateToolRequest = {
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
        version: '1.0.0',
      }

      await toolService.createTool(toolData)
      toast.success(t('messages.created'))
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.createFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('createModal.title')}</DialogTitle>
          <DialogDescription>
            {step === 1 && t('createModal.step1Desc')}
            {step === 2 && t('createModal.step2Desc')}
            {step === 3 && t('createModal.step3Desc')}
          </DialogDescription>
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
                    <Label htmlFor='id'>{t('fields.id')} *</Label>
                    <Input
                      id='id'
                      placeholder='my-tool'
                      value={formData.id}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          id: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                        })
                      }
                    />
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {t('fields.idHint')}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor='name'>{t('fields.name')} *</Label>
                    <Input
                      id='name'
                      placeholder='my_tool'
                      value={formData.name}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          name: e.target.value
                            .toLowerCase()
                            .replace(/\s+/g, '_'),
                        })
                      }
                    />
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {t('fields.nameHint')}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor='display_name'>
                      {t('fields.displayName')} *
                    </Label>
                    <Input
                      id='display_name'
                      placeholder={t('fields.displayNamePlaceholder')}
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
                    <Label htmlFor='description'>
                      {t('fields.description')} *
                    </Label>
                    <Textarea
                      id='description'
                      placeholder={t('fields.descriptionPlaceholder')}
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
                          setFormData({ ...formData, type: value as ToolType })
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
                    <Label htmlFor='url'>{t('fields.url')} *</Label>
                    <Input
                      id='url'
                      placeholder='https://api.example.com/{param}'
                      value={endpoint.url_template}
                      onChange={e =>
                        setEndpoint({
                          ...endpoint,
                          url_template: e.target.value,
                        })
                      }
                    />
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {t('fields.urlHint')}
                    </p>
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
                        setEndpoint({
                          ...endpoint,
                          auth_type: value as AuthType,
                        })
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
                      <Label htmlFor='token_env'>{t('fields.tokenEnv')}</Label>
                      <Input
                        id='token_env'
                        placeholder='MY_API_TOKEN'
                        value={endpoint.token_env}
                        onChange={e =>
                          setEndpoint({
                            ...endpoint,
                            token_env: e.target.value,
                          })
                        }
                      />
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {t('fields.tokenEnvHint')}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor='timeout'>{t('fields.timeout')}</Label>
                    <Input
                      id='timeout'
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

                {/* 添加参数表单 */}
                <div className='flex gap-2 items-end'>
                  <div className='flex-1'>
                    <Label>{t('fields.paramName')}</Label>
                    <Input
                      placeholder='url'
                      value={newParam.name}
                      onChange={e =>
                        setNewParam({ ...newParam, name: e.target.value })
                      }
                    />
                  </div>
                  <div className='w-32'>
                    <Label>{t('fields.paramType')}</Label>
                    <Select
                      value={newParam.type}
                      onValueChange={value =>
                        setNewParam({ ...newParam, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='string'>String</SelectItem>
                        <SelectItem value='number'>Number</SelectItem>
                        <SelectItem value='boolean'>Boolean</SelectItem>
                        <SelectItem value='array'>Array</SelectItem>
                        <SelectItem value='object'>Object</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex-1'>
                    <Label>{t('fields.paramDesc')}</Label>
                    <Input
                      placeholder={t('fields.paramDescPlaceholder')}
                      value={newParam.description}
                      onChange={e =>
                        setNewParam({
                          ...newParam,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='flex items-center gap-2 pb-2'>
                    <Switch
                      checked={newParam.required}
                      onCheckedChange={checked =>
                        setNewParam({ ...newParam, required: checked })
                      }
                    />
                    <Label className='whitespace-nowrap'>
                      {t('fields.required')}
                    </Label>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={addParameter}
                  >
                    <Plus className='size-4' />
                  </Button>
                </div>

                {/* 参数列表 */}
                {Object.keys(parameters).length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {Object.entries(parameters).map(([name, param]) => (
                      <Badge
                        key={name}
                        variant='secondary'
                        className='gap-1 pr-2'
                      >
                        {name}
                        {param.required && (
                          <span className='text-red-500'>*</span>
                        )}
                        <button
                          type='button'
                          onClick={() => removeParameter(name)}
                          className='ml-1 hover:text-destructive'
                        >
                          <X className='size-3' />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <hr />

                {/* 响应转换 */}
                <h3 className='text-lg font-semibold'>
                  {t('createModal.response')}
                </h3>

                <div className='grid gap-4'>
                  <div>
                    <Label htmlFor='extract'>{t('fields.extractPath')}</Label>
                    <Input
                      id='extract'
                      placeholder='$.data'
                      value={responseTransform.extract}
                      onChange={e =>
                        setResponseTransform({
                          ...responseTransform,
                          extract: e.target.value,
                        })
                      }
                    />
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {t('fields.extractHint')}
                    </p>
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
                onClick={() => {
                  if (step === 1 && validateStep1()) setStep(2)
                  else if (step === 2 && validateStep2()) setStep(3)
                }}
                disabled={isLoading}
              >
                {t('next')}
              </Button>
            ) : (
              <Button type='button' onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    {t('creating')}
                  </>
                ) : (
                  t('create')
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
