import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn-vue 标准 cn 工具 (合并 tailwind class) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
