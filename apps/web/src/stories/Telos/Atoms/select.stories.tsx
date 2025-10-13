import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select'
import { Label } from '@/components/atoms/label'
import { useState } from 'react'

const meta = {
  title: 'Telos/Atoms/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A dropdown component that displays a list of options and allows users to select one. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

// 基础下拉选择
export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='Select a fruit' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem value='banana'>Banana</SelectItem>
        <SelectItem value='blueberry'>Blueberry</SelectItem>
        <SelectItem value='grapes'>Grapes</SelectItem>
        <SelectItem value='pineapple'>Pineapple</SelectItem>
      </SelectContent>
    </Select>
  ),
}

// 带标签
export const WithLabel: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='fruit-select'>Favorite Fruit</Label>
      <Select>
        <SelectTrigger className='w-full' id='fruit-select'>
          <SelectValue placeholder='Select a fruit' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='apple'>Apple</SelectItem>
          <SelectItem value='banana'>Banana</SelectItem>
          <SelectItem value='blueberry'>Blueberry</SelectItem>
          <SelectItem value='grapes'>Grapes</SelectItem>
          <SelectItem value='pineapple'>Pineapple</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

// 带分组
export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className='w-[280px]'>
        <SelectValue placeholder='Select an item' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value='apple'>Apple</SelectItem>
          <SelectItem value='banana'>Banana</SelectItem>
          <SelectItem value='blueberry'>Blueberry</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          <SelectItem value='carrot'>Carrot</SelectItem>
          <SelectItem value='broccoli'>Broccoli</SelectItem>
          <SelectItem value='cucumber'>Cucumber</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Meat</SelectLabel>
          <SelectItem value='chicken'>Chicken</SelectItem>
          <SelectItem value='beef'>Beef</SelectItem>
          <SelectItem value='pork'>Pork</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

// 可控制的选择器
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('apple')

    return (
      <div className='space-y-3'>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Select a fruit' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='apple'>Apple</SelectItem>
            <SelectItem value='banana'>Banana</SelectItem>
            <SelectItem value='blueberry'>Blueberry</SelectItem>
            <SelectItem value='grapes'>Grapes</SelectItem>
            <SelectItem value='pineapple'>Pineapple</SelectItem>
          </SelectContent>
        </Select>
        <p className='text-sm text-muted-foreground'>
          Selected: <span className='font-medium'>{value}</span>
        </p>
      </div>
    )
  },
}

// 禁用选项
export const DisabledItems: Story = {
  render: () => (
    <Select>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='Select a fruit' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem value='banana' disabled>
          Banana (Out of stock)
        </SelectItem>
        <SelectItem value='blueberry'>Blueberry</SelectItem>
        <SelectItem value='grapes' disabled>
          Grapes (Out of stock)
        </SelectItem>
        <SelectItem value='pineapple'>Pineapple</SelectItem>
      </SelectContent>
    </Select>
  ),
}

// 小尺寸
export const SmallSize: Story = {
  render: () => (
    <Select>
      <SelectTrigger className='w-[180px]' size='sm'>
        <SelectValue placeholder='Select a fruit' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>Apple</SelectItem>
        <SelectItem value='banana'>Banana</SelectItem>
        <SelectItem value='blueberry'>Blueberry</SelectItem>
      </SelectContent>
    </Select>
  ),
}

// 表单示例
export const FormExample: Story = {
  render: () => {
    const [country, setCountry] = useState('')
    const [timezone, setTimezone] = useState('')

    return (
      <div className='space-y-4 w-80'>
        <div className='grid gap-1.5'>
          <Label htmlFor='country'>Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className='w-full' id='country'>
              <SelectValue placeholder='Select your country' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='us'>United States</SelectItem>
              <SelectItem value='uk'>United Kingdom</SelectItem>
              <SelectItem value='ca'>Canada</SelectItem>
              <SelectItem value='au'>Australia</SelectItem>
              <SelectItem value='de'>Germany</SelectItem>
              <SelectItem value='fr'>France</SelectItem>
              <SelectItem value='jp'>Japan</SelectItem>
              <SelectItem value='cn'>China</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='grid gap-1.5'>
          <Label htmlFor='timezone'>Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className='w-full' id='timezone'>
              <SelectValue placeholder='Select your timezone' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>North America</SelectLabel>
                <SelectItem value='est'>Eastern Standard Time (EST)</SelectItem>
                <SelectItem value='cst'>Central Standard Time (CST)</SelectItem>
                <SelectItem value='mst'>
                  Mountain Standard Time (MST)
                </SelectItem>
                <SelectItem value='pst'>Pacific Standard Time (PST)</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Europe</SelectLabel>
                <SelectItem value='gmt'>Greenwich Mean Time (GMT)</SelectItem>
                <SelectItem value='cet'>Central European Time (CET)</SelectItem>
                <SelectItem value='eet'>Eastern European Time (EET)</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Asia</SelectLabel>
                <SelectItem value='ist'>India Standard Time (IST)</SelectItem>
                <SelectItem value='cst-china'>
                  China Standard Time (CST)
                </SelectItem>
                <SelectItem value='jst'>Japan Standard Time (JST)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  },
}

// 长列表示例
export const LongList: Story = {
  render: () => (
    <Select>
      <SelectTrigger className='w-[200px]'>
        <SelectValue placeholder='Select a country' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='af'>Afghanistan</SelectItem>
        <SelectItem value='al'>Albania</SelectItem>
        <SelectItem value='dz'>Algeria</SelectItem>
        <SelectItem value='as'>American Samoa</SelectItem>
        <SelectItem value='ad'>Andorra</SelectItem>
        <SelectItem value='ao'>Angola</SelectItem>
        <SelectItem value='ai'>Anguilla</SelectItem>
        <SelectItem value='ag'>Antigua and Barbuda</SelectItem>
        <SelectItem value='ar'>Argentina</SelectItem>
        <SelectItem value='am'>Armenia</SelectItem>
        <SelectItem value='aw'>Aruba</SelectItem>
        <SelectItem value='au'>Australia</SelectItem>
        <SelectItem value='at'>Austria</SelectItem>
        <SelectItem value='az'>Azerbaijan</SelectItem>
        <SelectItem value='bs'>Bahamas</SelectItem>
        <SelectItem value='bh'>Bahrain</SelectItem>
        <SelectItem value='bd'>Bangladesh</SelectItem>
        <SelectItem value='bb'>Barbados</SelectItem>
        <SelectItem value='by'>Belarus</SelectItem>
        <SelectItem value='be'>Belgium</SelectItem>
        <SelectItem value='bz'>Belize</SelectItem>
        <SelectItem value='bj'>Benin</SelectItem>
        <SelectItem value='bm'>Bermuda</SelectItem>
        <SelectItem value='bt'>Bhutan</SelectItem>
        <SelectItem value='bo'>Bolivia</SelectItem>
      </SelectContent>
    </Select>
  ),
}

// 使用默认值
export const WithDefaultValue: Story = {
  render: () => (
    <div className='space-y-2'>
      <Label>Programming Language</Label>
      <Select defaultValue='typescript'>
        <SelectTrigger className='w-[200px]'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='javascript'>JavaScript</SelectItem>
          <SelectItem value='typescript'>TypeScript</SelectItem>
          <SelectItem value='python'>Python</SelectItem>
          <SelectItem value='java'>Java</SelectItem>
          <SelectItem value='go'>Go</SelectItem>
          <SelectItem value='rust'>Rust</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}
