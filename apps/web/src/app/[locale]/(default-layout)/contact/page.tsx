'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Mail, Github, MessageCircle, MapPin } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/atoms'
import {
  SectionWrapper,
  SectionTitle,
  GradientBlob,
} from '@/components/molecules'

export default function ContactPage() {
  const t = useTranslations('ContactPage')

  const contactMethods = [
    {
      icon: <Mail className='h-6 w-6' />,
      title: t('methods.email.title'),
      value: 'liuwenyu1937@outlook.com',
      href: 'mailto:liuwenyu1937@outlook.com',
    },
    {
      icon: <Github className='h-6 w-6' />,
      title: t('methods.github.title'),
      value: 'github.com/indulgeback/telos',
      href: 'https://github.com/indulgeback/telos',
    },
    {
      icon: <MessageCircle className='h-6 w-6' />,
      title: t('methods.issues.title'),
      value: t('methods.issues.value'),
      href: 'https://github.com/indulgeback/telos/issues',
    },
  ]

  return (
    <main className='pt-20'>
      {/* Hero */}
      <section className='relative py-20 px-4 overflow-hidden'>
        <GradientBlob color='accent' size='lg' position='top-left' />
        <div className='max-w-4xl mx-auto text-center relative z-10'>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className='text-4xl md:text-5xl font-display font-bold text-foreground mb-6'
          >
            {t('hero.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className='text-xl text-muted-foreground'
          >
            {t('hero.subtitle')}
          </motion.p>
        </div>
      </section>

      <SectionWrapper variant='card'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
          {/* Contact Methods */}
          <div>
            <SectionTitle
              title={t('methods.title')}
              align='left'
              className='mb-8'
            />
            <div className='space-y-6'>
              {contactMethods.map((method, index) => (
                <motion.a
                  key={index}
                  href={method.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className='flex items-center gap-4 p-4 rounded-lg border border-border bg-background hover:border-primary/30 transition-colors'
                >
                  <div className='p-2 rounded-lg bg-primary/10 text-primary'>
                    {method.icon}
                  </div>
                  <div>
                    <div className='font-body font-semibold text-foreground'>
                      {method.title}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {method.value}
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SectionTitle
              title={t('form.title')}
              align='left'
              className='mb-8'
            />
            <form className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Input placeholder={t('form.name')} />
                <Input type='email' placeholder={t('form.email')} />
              </div>
              <Input placeholder={t('form.subject')} />
              <Textarea placeholder={t('form.message')} rows={5} />
              <Button type='submit' className='w-full'>
                {t('form.submit')}
              </Button>
            </form>
          </motion.div>
        </div>
      </SectionWrapper>
    </main>
  )
}
