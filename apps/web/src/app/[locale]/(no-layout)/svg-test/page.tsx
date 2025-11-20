'use client'

import { getAvailableSvgNames } from '@/lib/icons/svg-registry'
import { SvgIcon } from '@/components/atoms/SvgIcon'

export default function SvgTestPage() {
  const icons = getAvailableSvgNames()

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-6'>SVG Icon Test Page</h1>
      <p className='mb-4 text-gray-600'>
        Found {icons.length} icons in the registry.
      </p>
      <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
        {icons.map(name => (
          <div
            key={name}
            className='border p-4 rounded flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors'
          >
            <SvgIcon name={name} className='w-12 h-12 text-blue-500' />
            <span className='text-xs text-gray-500 break-all text-center'>
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
