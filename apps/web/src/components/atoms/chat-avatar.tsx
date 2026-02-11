import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'
import { AiLottieIcon } from './ai-lottie-icon'

type ChatAvatarType = 'assistant' | 'user'

interface ChatAvatarProps {
  type: ChatAvatarType
  className?: string
  // 用户头像相关
  imageUrl?: string | null
  initials?: string | null
}

export function ChatAvatar({
  type,
  className,
  imageUrl,
  initials,
}: ChatAvatarProps) {
  // 用户类型使用 Avatar 组件（支持图片和首字母）
  if (type === 'user') {
    return (
      <Avatar className={cn('size-8', className)}>
        {imageUrl && <AvatarImage src={imageUrl} alt='User' />}
        <AvatarFallback className='bg-muted text-xs border'>
          {initials || <User className='size-4 text-muted-foreground' />}
        </AvatarFallback>
      </Avatar>
    )
  }

  // Assistant 使用默认图标
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border bg-primary/10',
        className
      )}
    >
      <AiLottieIcon className='size-5' />
    </div>
  )
}
