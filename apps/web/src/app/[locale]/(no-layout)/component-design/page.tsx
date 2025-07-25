'use client'

import {
  Button,
  Input,
  Textarea,
  Checkbox,
  Badge,
  Card,
  Carousel,
  Drawer,
  Pagination,
  Popover,
  Progress,
  Select,
  Slider,
  Switch,
  Table,
  Tabs,
  Tooltip,
} from '@/components/atoms'
import { ThemeToggle } from '@/components/molecules'
import NotFound from '@/app/not-found'

const ComponentDesignPage = () => {
  const env = process.env.NEXT_PUBLIC_NODE_ENV

  return env === 'production' ? (
    <NotFound />
  ) : (
    <div className='flex flex-col h-screen overflow-auto gap-4 p-4 bg-white dark:bg-black'>
      <ThemeToggle />
      <div className='flex gap-4'>
        <Button>Button</Button>
        <Button variant='destructive'>Button</Button>
        <Button variant='outline'>Button</Button>
        <Button variant='secondary'>Button</Button>
        <Button variant='ghost'>Button</Button>
        <Button variant='link'>Button</Button>
        <Button variant='smart-text-1'>Button</Button>
        <Button variant='smart-fill-1'>Button</Button>
        <Button variant='smart-fill-1' radius='sm'>
          Button
        </Button>
        <Button variant='smart-fill-1' radius='md'>
          Button
        </Button>
        <Button variant='smart-fill-1' radius='lg'>
          Button
        </Button>
        <Button variant='smart-fill-1' radius='xl'>
          Button
        </Button>
        <Button variant='smart-fill-1' radius='full'>
          Button
        </Button>
      </div>
      <div className='flex gap-4'>
        <Input />
      </div>
    </div>
  )
}

export default ComponentDesignPage
