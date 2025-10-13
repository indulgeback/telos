import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/atoms/accordion'

const meta = {
  title: 'Telos/Atoms/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A vertically stacked set of interactive headings that each reveal a section of content. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

// 基础手风琴
export const Default: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[500px]'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It adheres to the WAI-ARIA design pattern.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>
          Yes. It comes with default styles that matches the other components
          aesthetic.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>
          Yes. It's animated by default, but you can disable it if you prefer.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

// 允许多个展开
export const Multiple: Story = {
  render: () => (
    <Accordion type='multiple' className='w-[500px]'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Section 1</AccordionTrigger>
        <AccordionContent>
          This accordion allows multiple sections to be open at the same time.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Section 2</AccordionTrigger>
        <AccordionContent>
          You can open this section while keeping other sections open.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>Section 3</AccordionTrigger>
        <AccordionContent>
          All sections can be opened simultaneously.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

// 默认展开
export const DefaultOpen: Story = {
  render: () => (
    <Accordion
      type='single'
      collapsible
      defaultValue='item-2'
      className='w-[500px]'
    >
      <AccordionItem value='item-1'>
        <AccordionTrigger>First Item</AccordionTrigger>
        <AccordionContent>This is the first item content.</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Second Item (Default Open)</AccordionTrigger>
        <AccordionContent>
          This item is open by default. You can set any item to be open
          initially.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>Third Item</AccordionTrigger>
        <AccordionContent>This is the third item content.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

// FAQ示例
export const FAQ: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[600px]'>
      <AccordionItem value='faq-1'>
        <AccordionTrigger>What is your return policy?</AccordionTrigger>
        <AccordionContent>
          We offer a 30-day return policy for all unused items in their original
          packaging. Simply contact our customer service team to initiate a
          return.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='faq-2'>
        <AccordionTrigger>How long does shipping take?</AccordionTrigger>
        <AccordionContent>
          Standard shipping typically takes 5-7 business days. Express shipping
          options are available at checkout for 2-3 business day delivery.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='faq-3'>
        <AccordionTrigger>Do you ship internationally?</AccordionTrigger>
        <AccordionContent>
          Yes, we ship to over 100 countries worldwide. International shipping
          rates and delivery times vary by location and will be calculated at
          checkout.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='faq-4'>
        <AccordionTrigger>How can I track my order?</AccordionTrigger>
        <AccordionContent>
          Once your order ships, you'll receive a tracking number via email. You
          can use this number to track your package on our website or the
          carrier's website.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='faq-5'>
        <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
        <AccordionContent>
          We accept all major credit cards (Visa, MasterCard, American Express),
          PayPal, Apple Pay, and Google Pay. All transactions are secure and
          encrypted.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

// 带富文本内容
export const WithRichContent: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[600px]'>
      <AccordionItem value='features'>
        <AccordionTrigger>Key Features</AccordionTrigger>
        <AccordionContent>
          <ul className='list-disc list-inside space-y-2'>
            <li>High performance and reliability</li>
            <li>Easy to use interface</li>
            <li>Extensive documentation</li>
            <li>Active community support</li>
            <li>Regular updates and improvements</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='specifications'>
        <AccordionTrigger>Technical Specifications</AccordionTrigger>
        <AccordionContent>
          <div className='space-y-3'>
            <div>
              <strong className='font-semibold'>Dimensions:</strong> 10" x 8" x
              2"
            </div>
            <div>
              <strong className='font-semibold'>Weight:</strong> 1.5 lbs
            </div>
            <div>
              <strong className='font-semibold'>Material:</strong> Aluminum and
              Plastic
            </div>
            <div>
              <strong className='font-semibold'>Power:</strong> Rechargeable
              Li-ion Battery
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='warranty'>
        <AccordionTrigger>Warranty Information</AccordionTrigger>
        <AccordionContent>
          <p className='mb-2'>
            This product comes with a comprehensive warranty:
          </p>
          <ul className='list-disc list-inside space-y-1'>
            <li>1-year limited warranty on parts</li>
            <li>90-day warranty on accessories</li>
            <li>Free technical support for lifetime</li>
          </ul>
          <p className='mt-3 text-muted-foreground text-xs'>
            Terms and conditions apply. See full warranty details in your
            product manual.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

// 设置面板
export const SettingsPanel: Story = {
  render: () => (
    <Accordion type='multiple' className='w-[500px]'>
      <AccordionItem value='account'>
        <AccordionTrigger>Account Settings</AccordionTrigger>
        <AccordionContent>
          <div className='space-y-3'>
            <div>
              <label className='text-sm font-medium'>Email</label>
              <input
                type='email'
                placeholder='your@email.com'
                className='mt-1 w-full px-3 py-2 border rounded-md text-sm'
              />
            </div>
            <div>
              <label className='text-sm font-medium'>Username</label>
              <input
                type='text'
                placeholder='username'
                className='mt-1 w-full px-3 py-2 border rounded-md text-sm'
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='privacy'>
        <AccordionTrigger>Privacy Settings</AccordionTrigger>
        <AccordionContent>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>Profile visibility</span>
              <input type='checkbox' className='rounded' defaultChecked />
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>Show email</span>
              <input type='checkbox' className='rounded' />
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>Allow messages</span>
              <input type='checkbox' className='rounded' defaultChecked />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='notifications'>
        <AccordionTrigger>Notification Preferences</AccordionTrigger>
        <AccordionContent>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>Email notifications</span>
              <input type='checkbox' className='rounded' defaultChecked />
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>Push notifications</span>
              <input type='checkbox' className='rounded' defaultChecked />
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>SMS notifications</span>
              <input type='checkbox' className='rounded' />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

// 产品描述
export const ProductDetails: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[700px]'>
      <AccordionItem value='description'>
        <AccordionTrigger>Product Description</AccordionTrigger>
        <AccordionContent>
          <p className='leading-relaxed'>
            This premium product is crafted with attention to detail and
            designed to exceed your expectations. Made from high-quality
            materials, it combines functionality with elegant aesthetics.
            Perfect for both professional and personal use, this versatile item
            will quickly become an essential part of your daily routine.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='shipping'>
        <AccordionTrigger>Shipping & Returns</AccordionTrigger>
        <AccordionContent>
          <div className='space-y-2'>
            <p>
              <strong>Free Shipping:</strong> On orders over $50
            </p>
            <p>
              <strong>Standard Delivery:</strong> 5-7 business days
            </p>
            <p>
              <strong>Returns:</strong> 30-day hassle-free return policy
            </p>
            <p className='text-muted-foreground text-sm mt-3'>
              Please note that return shipping costs may apply for non-defective
              items.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='reviews'>
        <AccordionTrigger>Customer Reviews (4.8/5)</AccordionTrigger>
        <AccordionContent>
          <div className='space-y-4'>
            <div>
              <div className='flex items-center gap-2 mb-1'>
                <span className='font-semibold text-sm'>John D.</span>
                <span className='text-yellow-500'>★★★★★</span>
              </div>
              <p className='text-sm'>
                Excellent quality! Exceeded my expectations in every way.
              </p>
            </div>
            <div>
              <div className='flex items-center gap-2 mb-1'>
                <span className='font-semibold text-sm'>Sarah M.</span>
                <span className='text-yellow-500'>★★★★☆</span>
              </div>
              <p className='text-sm'>
                Great product, fast shipping. Would definitely recommend!
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

// 紧凑样式
export const Compact: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[400px]'>
      <AccordionItem value='1'>
        <AccordionTrigger className='py-2 text-xs'>
          Quick Question 1
        </AccordionTrigger>
        <AccordionContent className='text-xs pb-2'>
          Short answer to the first question.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='2'>
        <AccordionTrigger className='py-2 text-xs'>
          Quick Question 2
        </AccordionTrigger>
        <AccordionContent className='text-xs pb-2'>
          Short answer to the second question.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='3'>
        <AccordionTrigger className='py-2 text-xs'>
          Quick Question 3
        </AccordionTrigger>
        <AccordionContent className='text-xs pb-2'>
          Short answer to the third question.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

// 嵌套手风琴
export const Nested: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[600px]'>
      <AccordionItem value='parent-1'>
        <AccordionTrigger>Parent Section 1</AccordionTrigger>
        <AccordionContent>
          <Accordion type='single' collapsible className='pl-4'>
            <AccordionItem value='child-1-1'>
              <AccordionTrigger className='text-sm'>
                Child Section 1.1
              </AccordionTrigger>
              <AccordionContent className='text-sm'>
                Content for child section 1.1
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value='child-1-2'>
              <AccordionTrigger className='text-sm'>
                Child Section 1.2
              </AccordionTrigger>
              <AccordionContent className='text-sm'>
                Content for child section 1.2
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='parent-2'>
        <AccordionTrigger>Parent Section 2</AccordionTrigger>
        <AccordionContent>
          <Accordion type='single' collapsible className='pl-4'>
            <AccordionItem value='child-2-1'>
              <AccordionTrigger className='text-sm'>
                Child Section 2.1
              </AccordionTrigger>
              <AccordionContent className='text-sm'>
                Content for child section 2.1
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
