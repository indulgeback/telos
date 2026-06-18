'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms'
import { Button } from '@/components/atoms'
import { Input } from '@/components/atoms'
import { Textarea } from '@/components/atoms'
import { Label } from '@/components/atoms'
import { agentService, type Agent } from '@/service/agent'
import {
  Loader2,
  Sparkles,
  FileText,
  Volume2,
  ChevronDown,
  ChevronUp,
  Globe,
  Music,
  Mic,
} from 'lucide-react'
import { toast } from 'sonner'

interface EditAgentModalProps {
  agent: Agent
  onClose: () => void
  onSuccess: () => void
}

export function EditAgentModal({
  agent,
  onClose,
  onSuccess,
}: EditAgentModalProps) {
  const t = useTranslations('Agent')

  const isReadOnly = agent.type === 'system'

  const [name, setName] = useState(agent.name || '')
  const [description, setDescription] = useState(agent.description || '')
  const [instructions, setInstructions] = useState(agent.instructions || '')
  const [modelKey, setModelKey] = useState(
    agent.model_key || 'deepseek-v4-flash'
  )
  const [maxTurns, setMaxTurns] = useState(agent.max_turns || 8)
  const [loopMode, setLoopMode] = useState<'auto' | 'single_turn'>(
    agent.loop_mode || 'auto'
  )
  const [type, setType] = useState<'public' | 'private'>(
    agent.type === 'system' ? 'private' : (agent.type as 'public' | 'private')
  )
  const [isSaving, setIsSaving] = useState(false)

  // Voice Configuration States
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const initialVoice = agent.metadata?.voice || {}
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(
    initialVoice.enabled ?? true
  )
  const [voiceSpeakingStyle, setVoiceSpeakingStyle] = useState<string>(
    initialVoice.speakingStyle || '自然、清晰、可靠'
  )
  const [voiceSpeaker, setVoiceSpeaker] = useState<string>(
    initialVoice.speaker || 'zh_female_vv_jupiter_bigtts'
  )
  const [voiceWebSearchEnabled, setVoiceWebSearchEnabled] = useState<boolean>(
    initialVoice.webSearchEnabled ?? false
  )
  const [voiceSingingEnabled, setVoiceSingingEnabled] = useState<boolean>(
    initialVoice.singingEnabled ?? false
  )
  const [voiceCharacterDetails, setVoiceCharacterDetails] = useState<string>(
    initialVoice.characterDetails || ''
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return

    if (!name.trim() || !description.trim()) {
      toast.error(t('form.required'))
      return
    }

    setIsSaving(true)
    try {
      const updatedVoice = {
        enabled: voiceEnabled,
        speakingStyle: voiceSpeakingStyle.trim(),
        speaker: voiceSpeaker.trim(),
        webSearchEnabled: voiceWebSearchEnabled,
        singingEnabled: voiceSingingEnabled,
        characterDetails: voiceCharacterDetails.trim(),
      }
      const updatedMetadata = {
        ...(agent.metadata || {}),
        voice: updatedVoice,
      }

      await agentService.updateAgent(agent.id, {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions,
        type,
        modelKey: modelKey.trim() || 'deepseek-v4-flash',
        maxTurns,
        loopMode,
        metadata: updatedMetadata,
      })
      toast.success(t('messages.updateSuccess'))
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.updateError')
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-[680px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl font-bold'>
            <FileText className='size-5 text-primary' />
            {isReadOnly ? t('viewTitle') : t('editTitle')}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly ? t('viewDesc') : t('editDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6 pt-2'>
          {/* Name & Description */}
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='edit-name'>
                {t('form.name')} <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='edit-name'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('form.namePlaceholder')}
                disabled={isReadOnly || isSaving}
                maxLength={100}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-type-select'>{t('form.typeLabel')}</Label>
              {isReadOnly ? (
                <Input
                  id='edit-type-select'
                  value={t('types.systemReadOnly')}
                  disabled
                />
              ) : (
                <select
                  id='edit-type-select'
                  value={type}
                  onChange={e =>
                    setType(e.target.value as 'public' | 'private')
                  }
                  disabled={isSaving}
                  className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring'
                >
                  <option value='private'>{t('form.typePrivateSelect')}</option>
                  <option value='public'>{t('form.typePublicSelect')}</option>
                </select>
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='edit-description'>
              {t('form.descriptionLabel')}{' '}
              <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='edit-description'
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              disabled={isReadOnly || isSaving}
              maxLength={500}
            />
          </div>

          {/* Prompt / Instructions (核心改动区域) */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label
                htmlFor='edit-instructions'
                className='text-sm font-semibold flex items-center gap-1.5'
              >
                <Sparkles className='size-4 text-primary' />
                {t('form.systemPrompt')}
              </Label>
              {isReadOnly && (
                <span className='text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded'>
                  {t('readOnly')}
                </span>
              )}
            </div>
            <Textarea
              id='edit-instructions'
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder={t('form.instructionsPlaceholder')}
              disabled={isReadOnly || isSaving}
              rows={8}
              className='font-mono text-sm leading-relaxed resize-y min-h-[160px]'
            />
            {!isReadOnly && (
              <p className='text-xs text-muted-foreground'>
                {t('form.instructionsDesc')}
              </p>
            )}
          </div>

          {/* Model settings */}
          <div className='grid gap-4 md:grid-cols-[1fr_140px_160px] border-t pt-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-modelKey'>{t('form.modelKey')}</Label>
              <Input
                id='edit-modelKey'
                value={modelKey}
                onChange={e => setModelKey(e.target.value)}
                placeholder='deepseek-v4-flash'
                disabled={isReadOnly || isSaving}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-maxTurns'>{t('form.maxTurns')}</Label>
              <Input
                id='edit-maxTurns'
                type='number'
                min={1}
                max={20}
                value={maxTurns}
                onChange={e => setMaxTurns(Number(e.target.value) || 8)}
                disabled={isReadOnly || isSaving}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-loopMode'>{t('form.loopMode')}</Label>
              <select
                id='edit-loopMode'
                value={loopMode}
                onChange={e =>
                  setLoopMode(
                    e.target.value === 'single_turn' ? 'single_turn' : 'auto'
                  )
                }
                disabled={isReadOnly || isSaving}
                className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring'
              >
                <option value='auto'>{t('form.loopAuto')}</option>
                <option value='single_turn'>{t('form.loopSingleTurn')}</option>
              </select>
            </div>
          </div>

          {/* 实时语音 Live 设置 */}
          <div className='border-t pt-4'>
            <button
              type='button'
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className='flex w-full items-center justify-between py-2 text-sm font-semibold hover:opacity-85 focus:outline-none'
            >
              <div className='flex items-center gap-2'>
                <Volume2 className='size-4 text-primary' />
                <span>{t('form.voiceSettingsTitle')}</span>
              </div>
              {showVoiceSettings ? (
                <ChevronUp className='size-4 text-muted-foreground' />
              ) : (
                <ChevronDown className='size-4 text-muted-foreground' />
              )}
            </button>

            {showVoiceSettings && (
              <div className='mt-4 space-y-4 rounded-lg bg-muted/30 p-4 border border-border'>
                {/* 语音开关 */}
                <div className='flex items-center justify-between pb-2 border-b border-border/50'>
                  <div className='space-y-0.5'>
                    <Label className='text-sm font-medium'>
                      {t('form.voiceEnabled')}
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      {t('form.voiceEnabledDesc')}
                    </p>
                  </div>
                  <input
                    type='checkbox'
                    checked={voiceEnabled}
                    onChange={e => setVoiceEnabled(e.target.checked)}
                    disabled={isReadOnly || isSaving}
                    className='size-4 rounded border-gray-300 text-primary focus:ring-primary'
                  />
                </div>

                {voiceEnabled && (
                  <div className='space-y-4'>
                    {/* 音色与风格 */}
                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label htmlFor='voice-speaker'>
                          {t('form.voiceSpeaker')}
                        </Label>
                        <select
                          id='voice-speaker'
                          value={voiceSpeaker}
                          onChange={e => setVoiceSpeaker(e.target.value)}
                          disabled={isReadOnly || isSaving}
                          className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring'
                        >
                          <option value='zh_female_vv_jupiter_bigtts'>
                            {t('speakers.vv')}
                          </option>
                          <option value='zh_female_xiaohe_jupiter_bigtts'>
                            {t('speakers.xiaohe')}
                          </option>
                          <option value='zh_male_yunzhou_jupiter_bigtts'>
                            {t('speakers.yunzhou')}
                          </option>
                          <option value='zh_male_xiaotian_jupiter_bigtts'>
                            {t('speakers.xiaotian')}
                          </option>
                          <option value='en_male_tim_uranus_bigtts'>
                            {t('speakers.tim')}
                          </option>
                          <option value='en_female_dacey_uranus_bigtts'>
                            {t('speakers.dacey')}
                          </option>
                          <option value='en_female_stokie_uranus_bigtts'>
                            {t('speakers.stokie')}
                          </option>
                        </select>
                        <Input
                          value={voiceSpeaker}
                          onChange={e => setVoiceSpeaker(e.target.value)}
                          placeholder='自定义音色ID'
                          disabled={isReadOnly || isSaving}
                          className='mt-1 text-xs font-mono'
                        />
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='voice-style'>
                          {t('form.voiceStyle')}
                        </Label>
                        <Input
                          id='voice-style'
                          value={voiceSpeakingStyle}
                          onChange={e => setVoiceSpeakingStyle(e.target.value)}
                          placeholder='例如：温柔、幽默、严肃'
                          disabled={isReadOnly || isSaving}
                          maxLength={50}
                        />
                        <div className='flex flex-wrap gap-1.5 mt-1'>
                          {['温柔耐心', '幽默风趣', '严肃专业', '傲娇活泼'].map(
                            style => (
                              <button
                                key={style}
                                type='button'
                                onClick={() => setVoiceSpeakingStyle(style)}
                                disabled={isReadOnly || isSaving}
                                className='text-[10px] bg-muted hover:bg-muted-foreground/15 px-2 py-0.5 rounded border border-border'
                              >
                                {style}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 开关功能：联网与唱歌 */}
                    <div className='grid gap-4 md:grid-cols-2 pt-2'>
                      <div className='flex items-center justify-between rounded-md border border-border/60 bg-background/50 p-3'>
                        <div className='flex items-center gap-2'>
                          <Globe className='size-4 text-primary' />
                          <div className='space-y-0.5'>
                            <Label className='text-sm font-medium'>
                              {t('form.voiceWebSearch')}
                            </Label>
                            <p className='text-[10px] text-muted-foreground'>
                              {t('form.voiceWebSearchDesc')}
                            </p>
                          </div>
                        </div>
                        <input
                          type='checkbox'
                          checked={voiceWebSearchEnabled}
                          onChange={e =>
                            setVoiceWebSearchEnabled(e.target.checked)
                          }
                          disabled={isReadOnly || isSaving}
                          className='size-4 rounded border-gray-300 text-primary focus:ring-primary'
                        />
                      </div>

                      <div className='flex items-center justify-between rounded-md border border-border/60 bg-background/50 p-3'>
                        <div className='flex items-center gap-2'>
                          <Music className='size-4 text-primary' />
                          <div className='space-y-0.5'>
                            <Label className='text-sm font-medium'>
                              {t('form.voiceSinging')}
                            </Label>
                            <p className='text-[10px] text-muted-foreground'>
                              {t('form.voiceSingingDesc')}
                            </p>
                          </div>
                        </div>
                        <input
                          type='checkbox'
                          checked={voiceSingingEnabled}
                          onChange={e =>
                            setVoiceSingingEnabled(e.target.checked)
                          }
                          disabled={isReadOnly || isSaving}
                          className='size-4 rounded border-gray-300 text-primary focus:ring-primary'
                        />
                      </div>
                    </div>

                    {/* 语音细节设定 */}
                    <div className='space-y-2'>
                      <Label
                        htmlFor='voice-details'
                        className='text-xs font-semibold'
                      >
                        {t('form.voiceDetails')}
                      </Label>
                      <Textarea
                        id='voice-details'
                        value={voiceCharacterDetails}
                        onChange={e => setVoiceCharacterDetails(e.target.value)}
                        placeholder='选填。在此输入该代理语音交流时的独特腔调、情感细节或语气偏好...'
                        disabled={isReadOnly || isSaving}
                        rows={3}
                        className='text-xs resize-none'
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className='border-t pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isSaving}
            >
              {isReadOnly ? t('close') : t('cancel')}
            </Button>
            {!isReadOnly && (
              <Button type='submit' disabled={isSaving} className='gap-1.5'>
                {isSaving && <Loader2 className='size-4 animate-spin' />}
                {t('saveChanges')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
