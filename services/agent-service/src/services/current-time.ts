export const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

function requestedTimeZone(input: unknown): string {
  if (typeof input === 'string') {
    const value = input.trim()
    if (!value || value === '{}') return DEFAULT_TIME_ZONE

    if (value.startsWith('{')) {
      try {
        return requestedTimeZone(JSON.parse(value))
      } catch {
        return value
      }
    }

    return value
  }

  if (input && typeof input === 'object') {
    const timezone = (input as Record<string, unknown>).timezone
    if (typeof timezone === 'string' && timezone.trim()) {
      return timezone.trim()
    }
  }

  return DEFAULT_TIME_ZONE
}

export function formatCurrentTime(
  input?: unknown,
  now: Date = new Date()
): string {
  const timeZone = requestedTimeZone(input)

  try {
    const formatted = new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone,
    }).format(now)
    const zoneLabel =
      timeZone === DEFAULT_TIME_ZONE
        ? `北京时间，${DEFAULT_TIME_ZONE}`
        : timeZone

    return `当前时间（${zoneLabel}）：${formatted}`
  } catch {
    return `时区无效：${timeZone}。请使用 IANA 时区标识符，例如 Asia/Shanghai。`
  }
}
