'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ComponentProps } from 'react'

export default function LocalizedLink({ href, ...props }: ComponentProps<typeof Link>) {
  const locale = useLocale()
  
  // Se il link è interno (inizia con '/'), anteponiamo la lingua corrente
  const localizedHref = typeof href === 'string' && href.startsWith('/') 
    ? `/${locale}${href}` 
    : href

  return <Link href={localizedHref} {...props} />
}