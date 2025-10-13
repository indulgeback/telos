import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Slider } from '@/components/atoms/slider'
import { Label } from '@/components/atoms/label'
import { useState } from 'react'
import { Volume2, VolumeX, Sun, Moon } from 'lucide-react'

const meta = {
  title: 'Telos/Atoms/Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A slider component for selecting a value or range from a continuous scale. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
  argTypes: {
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    step: {
      control: 'number',
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

// 基础滑块
export const Default: Story = {
  render: () => (
    <div className='w-80'>
      <Slider defaultValue={[50]} max={100} step={1} />
    </div>
  ),
}

// 带标签
export const WithLabel: Story = {
  render: () => (
    <div className='w-80 space-y-4'>
      <div className='flex justify-between'>
        <Label>Volume</Label>
        <span className='text-sm text-muted-foreground'>50</span>
      </div>
      <Slider defaultValue={[50]} max={100} step={1} />
    </div>
  ),
}

// 可控制的滑块
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState([50])

    return (
      <div className='w-80 space-y-4'>
        <div className='flex justify-between'>
          <Label>Value</Label>
          <span className='text-sm font-medium'>{value[0]}</span>
        </div>
        <Slider value={value} onValueChange={setValue} max={100} step={1} />
      </div>
    )
  },
}

// 范围滑块
export const Range: Story = {
  render: () => {
    const [value, setValue] = useState([25, 75])

    return (
      <div className='w-80 space-y-4'>
        <div className='flex justify-between'>
          <Label>Range</Label>
          <span className='text-sm text-muted-foreground'>
            {value[0]} - {value[1]}
          </span>
        </div>
        <Slider value={value} onValueChange={setValue} max={100} step={1} />
      </div>
    )
  },
}

// 禁用状态
export const Disabled: Story = {
  render: () => (
    <div className='w-80 space-y-2'>
      <Label className='opacity-50'>Disabled Slider</Label>
      <Slider defaultValue={[50]} max={100} step={1} disabled />
    </div>
  ),
}

// 不同步长
export const Steps: Story = {
  render: () => (
    <div className='w-80 space-y-6'>
      <div className='space-y-2'>
        <div className='flex justify-between'>
          <Label>Step: 1</Label>
          <span className='text-sm text-muted-foreground'>50</span>
        </div>
        <Slider defaultValue={[50]} max={100} step={1} />
      </div>

      <div className='space-y-2'>
        <div className='flex justify-between'>
          <Label>Step: 5</Label>
          <span className='text-sm text-muted-foreground'>50</span>
        </div>
        <Slider defaultValue={[50]} max={100} step={5} />
      </div>

      <div className='space-y-2'>
        <div className='flex justify-between'>
          <Label>Step: 10</Label>
          <span className='text-sm text-muted-foreground'>50</span>
        </div>
        <Slider defaultValue={[50]} max={100} step={10} />
      </div>
    </div>
  ),
}

// 音量控制
export const VolumeControl: Story = {
  render: () => {
    const [volume, setVolume] = useState([70])

    return (
      <div className='w-80'>
        <div className='rounded-lg border p-6 space-y-4'>
          <div className='flex items-center justify-between'>
            <Label className='text-base'>Volume</Label>
            <span className='text-2xl font-bold'>{volume[0]}%</span>
          </div>
          <div className='flex items-center gap-4'>
            <VolumeX className='h-5 w-5 text-muted-foreground flex-shrink-0' />
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className='flex-1'
            />
            <Volume2 className='h-5 w-5 text-muted-foreground flex-shrink-0' />
          </div>
        </div>
      </div>
    )
  },
}

// 亮度控制
export const BrightnessControl: Story = {
  render: () => {
    const [brightness, setBrightness] = useState([60])

    return (
      <div className='w-80'>
        <div className='rounded-lg border p-6 space-y-4'>
          <div className='flex items-center justify-between'>
            <Label className='text-base'>Brightness</Label>
            <span className='text-sm font-medium'>{brightness[0]}%</span>
          </div>
          <div className='flex items-center gap-4'>
            <Moon className='h-4 w-4 text-muted-foreground flex-shrink-0' />
            <Slider
              value={brightness}
              onValueChange={setBrightness}
              max={100}
              step={1}
              className='flex-1'
            />
            <Sun className='h-5 w-5 text-muted-foreground flex-shrink-0' />
          </div>
        </div>
      </div>
    )
  },
}

// 价格范围筛选
export const PriceRange: Story = {
  render: () => {
    const [priceRange, setPriceRange] = useState([0, 1000])

    return (
      <div className='w-96'>
        <div className='rounded-lg border p-6 space-y-4'>
          <div>
            <Label className='text-base mb-4 block'>Price Range</Label>
            <div className='flex items-center justify-between mb-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold'>${priceRange[0]}</div>
                <div className='text-xs text-muted-foreground'>Min</div>
              </div>
              <div className='text-muted-foreground'>—</div>
              <div className='text-center'>
                <div className='text-2xl font-bold'>${priceRange[1]}</div>
                <div className='text-xs text-muted-foreground'>Max</div>
              </div>
            </div>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={1000}
              step={10}
            />
          </div>
          <button
            type='button'
            className='w-full inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90'
          >
            Apply Filter
          </button>
        </div>
      </div>
    )
  },
}

// 温度控制
export const TemperatureControl: Story = {
  render: () => {
    const [temperature, setTemperature] = useState([22])

    return (
      <div className='w-80'>
        <div className='rounded-lg border p-6 space-y-6'>
          <div className='text-center'>
            <div className='text-5xl font-bold mb-2'>{temperature[0]}°C</div>
            <div className='text-sm text-muted-foreground'>
              Room Temperature
            </div>
          </div>
          <Slider
            value={temperature}
            onValueChange={setTemperature}
            min={16}
            max={30}
            step={0.5}
          />
          <div className='flex justify-between text-xs text-muted-foreground'>
            <span>16°C</span>
            <span>30°C</span>
          </div>
        </div>
      </div>
    )
  },
}

// 多个滑块
export const MultipleSliders: Story = {
  render: () => {
    const [bass, setBass] = useState([50])
    const [mid, setMid] = useState([50])
    const [treble, setTreble] = useState([50])

    return (
      <div className='w-96'>
        <div className='rounded-lg border p-6 space-y-6'>
          <h3 className='text-lg font-semibold'>Equalizer</h3>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <Label>Bass</Label>
                <span className='text-sm text-muted-foreground'>{bass[0]}</span>
              </div>
              <Slider value={bass} onValueChange={setBass} max={100} step={1} />
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between'>
                <Label>Mid</Label>
                <span className='text-sm text-muted-foreground'>{mid[0]}</span>
              </div>
              <Slider value={mid} onValueChange={setMid} max={100} step={1} />
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between'>
                <Label>Treble</Label>
                <span className='text-sm text-muted-foreground'>
                  {treble[0]}
                </span>
              </div>
              <Slider
                value={treble}
                onValueChange={setTreble}
                max={100}
                step={1}
              />
            </div>
          </div>

          <div className='flex gap-2 pt-2'>
            <button
              type='button'
              onClick={() => {
                setBass([50])
                setMid([50])
                setTreble([50])
              }}
              className='flex-1 inline-flex h-9 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent'
            >
              Reset
            </button>
            <button
              type='button'
              className='flex-1 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90'
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    )
  },
}

// 年龄范围选择
export const AgeRange: Story = {
  render: () => {
    const [ageRange, setAgeRange] = useState([18, 65])

    return (
      <div className='w-80'>
        <div className='space-y-4'>
          <Label>Age Range</Label>
          <Slider
            value={ageRange}
            onValueChange={setAgeRange}
            min={0}
            max={100}
            step={1}
          />
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>{ageRange[0]} years</span>
            <span className='text-muted-foreground'>{ageRange[1]} years</span>
          </div>
        </div>
      </div>
    )
  },
}

// 缩放控制
export const ZoomControl: Story = {
  render: () => {
    const [zoom, setZoom] = useState([100])

    return (
      <div className='w-80'>
        <div className='rounded-lg border p-6 space-y-4'>
          <div className='flex items-center justify-between'>
            <Label>Zoom Level</Label>
            <span className='text-sm font-medium'>{zoom[0]}%</span>
          </div>
          <Slider
            value={zoom}
            onValueChange={setZoom}
            min={50}
            max={200}
            step={10}
          />
          <div className='flex justify-between text-xs text-muted-foreground'>
            <span>50%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => setZoom([Math.max(50, zoom[0] - 10)])}
              className='flex-1 inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent'
            >
              −
            </button>
            <button
              type='button'
              onClick={() => setZoom([100])}
              className='flex-1 inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent'
            >
              Reset
            </button>
            <button
              type='button'
              onClick={() => setZoom([Math.min(200, zoom[0] + 10)])}
              className='flex-1 inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent'
            >
              +
            </button>
          </div>
        </div>
      </div>
    )
  },
}

// 进度指示器（只读）
export const ProgressIndicator: Story = {
  render: () => {
    const [progress] = useState([75])

    return (
      <div className='w-80'>
        <div className='space-y-2'>
          <div className='flex justify-between'>
            <Label>Download Progress</Label>
            <span className='text-sm font-medium'>{progress[0]}%</span>
          </div>
          <Slider value={progress} max={100} step={1} disabled />
          <p className='text-xs text-muted-foreground'>
            Downloading file... 750 MB of 1000 MB
          </p>
        </div>
      </div>
    )
  },
}
