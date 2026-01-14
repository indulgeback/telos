import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChatAvatarType = 'assistant' | 'user'

interface ChatAvatarProps {
  type: ChatAvatarType
  className?: string
}

export function ChatAvatar({ type, className }: ChatAvatarProps) {
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border',
        type === 'assistant' ? 'bg-primary/10' : 'bg-muted',
        className
      )}
    >
      {type === 'assistant' ? (
        <Bot className='size-4 text-primary' />
      ) : (
        <User className='size-4 text-muted-foreground' />
      )}
    </div>
  )
}
