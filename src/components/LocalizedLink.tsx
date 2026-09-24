'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ComponentProps } from 'react'
import { defaultLocale } from '../../i18n'

export default function LocalizedLink({ href, ...props }: ComponentProps<typeof Link>) {
  const locale = useLocale()

  // Se il link è interno (inizia con '/'), anteponiamo la lingua corrente —
  // ma non per la lingua di default: con localePrefix: 'as-needed' quella
  // non ha mai un prefisso nell'URL, quindi anteporlo comunque produceva
  // /it/... che il middleware doveva poi ridirigere verso /... a ogni click.
  const localizedHref = typeof href === 'string' && href.startsWith('/') && locale !== defaultLocale
    ? `/${locale}${href}`
    : href

  return <Link href={localizedHref} {...props} />
}