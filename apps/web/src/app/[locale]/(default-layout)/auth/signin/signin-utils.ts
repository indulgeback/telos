export function getSignInCallback(value: string | null): string {
  const path = value?.trim()
  if (
    !path ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(path)
  ) {
    return '/chat'
  }
  try {
    const url = new URL(path, 'https://telos.invalid')
    return url.origin === 'https://telos.invalid'
      ? `${url.pathname}${url.search}${url.hash}`
      : '/chat'
  } catch {
    return '/chat'
  }
}
