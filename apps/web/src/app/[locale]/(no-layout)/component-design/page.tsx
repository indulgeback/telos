'use client'

import {
  Button,
  Input,
  Textarea,
  Checkbox,
  Badge,
  Label,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/atoms'
import { ThemeToggle } from '@/components/molecules'
import NotFound from '@/app/not-found'
import { Bold, GitBranch, Italic, Underline } from 'lucide-react'

const ComponentDesignPage = () => {
  const env = process.env.NEXT_PUBLIC_NODE_ENV

  return env === 'production' ? (
    <NotFound />
  ) : (
    <div className='flex flex-col h-screen overflow-auto gap-4 p-4 bg-white dark:bg-black'>
      <ThemeToggle />
      <div className='gap-4 flex'>
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
        <Button variant='smart-fill-1' radius='md' size='sm'>
          Button
        </Button>
        <Button
          variant='smart-fill-1'
          radius='full'
          size='lg'
          className='w-[350px]'
        >
          Button
        </Button>
        <Button variant='smart-fill-1' radius='xl'>
          Button
        </Button>
        <Button variant='smart-fill-1' radius='full'>
          Button
        </Button>
        <Button variant='smart-fill-1' radius='full' size='icon'>
          <GitBranch />
        </Button>
      </div>
      <div className='flex flex-col gap-4'>
        <Input className='w-[350px]' />
        <Input className='w-[350px]' placeholder='Placeholder' />
        <Input className='w-[350px]' disabled />
        <Input className='w-[350px]' type='password' />
      </div>
      <div className='flex flex-col gap-4'>
        <Textarea className='w-[350px]' />
        <Textarea className='w-[350px]' placeholder='Placeholder' />
        <Textarea className='w-[350px]' disabled />
      </div>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-2'>
          <Checkbox id='checkbox' />
          <Label htmlFor='checkbox'>Label</Label>
        </div>
        <div className='flex items-center gap-2'>
          <Checkbox id='checkbox' disabled />
          <Label htmlFor='checkbox'>Label</Label>
        </div>
      </div>
      <div className='flex flex-col items-center gap-4'>
        <div className='flex w-full flex-wrap gap-4'>
          <Badge>Badge</Badge>
          <Badge variant='secondary'>Secondary</Badge>
          <Badge variant='destructive'>Destructive</Badge>
          <Badge variant='outline'>Outline</Badge>
        </div>
        <div className='flex w-full flex-wrap gap-4'>
          <Badge
            variant='secondary'
            className='bg-blue-500 text-white dark:bg-blue-600'
          >
            <GitBranch />
            Verified
          </Badge>
          <Badge className='h-5 min-w-5 rounded-full px-1'>8</Badge>
          <Badge
            className='h-5 min-w-5 rounded-full px-1'
            variant='destructive'
          >
            99
          </Badge>
          <Badge className='h-5 min-w-5 rounded-full px-1' variant='outline'>
            40+
          </Badge>
        </div>
      </div>
      <div className='flex  gap-4'>
        <Toggle aria-label='Toggle italic'>
          <Bold className='h-4 w-4' />
        </Toggle>
        <ToggleGroup variant='outline' type='multiple'>
          <ToggleGroupItem value='bold' aria-label='Toggle bold'>
            <Bold className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='italic' aria-label='Toggle italic'>
            <Italic className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='strikethrough'
            aria-label='Toggle strikethrough'
          >
            <Underline className='h-4 w-4' />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}

export default ComponentDesignPage
