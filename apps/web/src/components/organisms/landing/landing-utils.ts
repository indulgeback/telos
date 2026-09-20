export function getLandingStartHref(signedIn: boolean, prompt = '') {
  const text = prompt.trim()
  const chat = text ? `/chat?${new URLSearchParams({ prompt: text })}` : '/chat'
  return signedIn
    ? chat
    : `/auth/signin?${new URLSearchParams({ callbackUrl: chat })}`
}
