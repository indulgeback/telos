import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        'smart-text-1':
          'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:bg-gradient-to-r hover:from-purple-400 hover:via-pink-400 hover:to-blue-400',
        'smart-text-2':
          'text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:bg-gradient-to-r hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400',
        'smart-text-3':
          'text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-yellow-500 to-red-500 hover:bg-gradient-to-r hover:from-orange-400 hover:via-yellow-400 hover:to-red-400',
        'smart-text-4':
          'text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-lime-500 to-emerald-500 hover:bg-gradient-to-r hover:from-green-400 hover:via-lime-400 hover:to-emerald-400',
        'smart-fill-1':
          'text-white bg-gradient-to-tr from-purple-500 via-pink-500 to-blue-500 hover:bg-gradient-to-tr hover:from-purple-400 hover:via-pink-400 hover:to-blue-400 smart-fill-btn-hover',
        'smart-fill-2':
          'text-white bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 hover:bg-gradient-to-tr hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 smart-fill-btn-hover',
        'smart-fill-3':
          'text-white bg-gradient-to-tr from-orange-500 via-yellow-500 to-red-500 hover:bg-gradient-to-tr hover:from-orange-400 hover:via-yellow-400 hover:to-red-400 smart-fill-btn-hover',
        'smart-fill-4':
          'text-white bg-gradient-to-tr from-green-500 via-lime-500 to-emerald-500 hover:bg-gradient-to-tr hover:from-green-400 hover:via-lime-400 hover:to-emerald-400 smart-fill-btn-hover',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
      radius: {
        default: 'rounded-md',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      radius: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  radius,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot='button'
      className={cn(buttonVariants({ variant, size, radius, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
