export interface ModelLabelOption {
  model: string
  label: string
}

export function resolveMessageModelLabel(options: {
  persistedModelKey?: string | null
  transientLabel?: string
  modelOptions: ModelLabelOption[]
}): string | undefined {
  const persistedModelKey = options.persistedModelKey?.trim()
  if (!persistedModelKey) return options.transientLabel || undefined

  return (
    options.modelOptions.find(item => item.model === persistedModelKey)
      ?.label || persistedModelKey
  )
}
