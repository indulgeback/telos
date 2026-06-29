import { Suspense } from 'react'
import { ChatView } from './ChatView'

export default function ChatPage() {
  // useSearchParams() 需要 Suspense 边界(Next 15 要求)
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  )
}
