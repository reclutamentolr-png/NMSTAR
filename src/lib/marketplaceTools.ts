export const MARKETPLACE_CATEGORIES = ['marketing', 'security', 'personal', 'wellness', 'community'] as const
export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number]

export interface MarketplaceTool {
  toolName: string
  href: string
  gradient: string
  iconName: string
  title: string
  description: string
  color: string
  category: Exclude<MarketplaceCategory, 'community'>
  requiresSubscription?: boolean
}

/**
 * Shared by the marketplace landing page (category tiles + counts) and each
 * category detail page (the actual tool grid). `t` only needs to resolve
 * plain string keys with no interpolation — every title/description here
 * is a bare message.
 */
export function getMarketplaceTools(t: (key: string) => string): MarketplaceTool[] {
  return [
    {
      toolName: 'qr-generator',
      href: '/marketplace/qr-generator',
      gradient: 'bg-[var(--ink)]',
      iconName: 'Smartphone',
      title: t('qrGenerator'),
      description: t('qrDescription'),
      color: 'gold',
      category: 'marketing',
    },
    {
      toolName: 'whatsapp-messages',
      href: '/marketplace/whatsapp-messages',
      gradient: 'bg-[var(--ink)]',
      iconName: 'MessageCircle',
      title: t('whatsappMessages'),
      description: t('whatsappDescription'),
      color: 'gold',
      category: 'marketing',
    },
    {
      toolName: 'link-in-bio',
      href: '/marketplace/link-in-bio',
      gradient: 'bg-[var(--ink)]',
      iconName: 'Link2',
      title: t('linkInBio'),
      description: t('linkInBioDescription'),
      color: 'gold',
      category: 'marketing',
      requiresSubscription: true,
    },
    {
      toolName: 'offermaker',
      href: '/marketplace/offermaker',
      gradient: 'bg-[var(--ink)]',
      iconName: 'Wand2',
      title: t('offermaker'),
      description: t('offermakerDescription'),
      color: 'gold',
      category: 'marketing',
      requiresSubscription: true,
    },
    {
      toolName: 'qr-code-pro',
      href: '/marketplace/qr-code-pro',
      gradient: 'bg-[var(--ink)]',
      iconName: 'QrCode',
      title: t('qrCodePro'),
      description: t('qrCodeProDescription'),
      color: 'gold',
      category: 'marketing',
      requiresSubscription: true,
    },
    {
      toolName: 'svat',
      href: '/marketplace/svat',
      gradient: 'bg-[var(--ink)]',
      iconName: 'ShieldCheck',
      title: t('svat'),
      description: t('svatDescription'),
      color: 'gold',
      category: 'security',
      requiresSubscription: true,
    },
    {
      toolName: 'memolife',
      href: '/marketplace/memolife',
      gradient: 'bg-[var(--ink)]',
      iconName: 'Brain',
      title: t('memolife'),
      description: t('memolifeDescription'),
      color: 'gold',
      category: 'personal',
      requiresSubscription: true,
    },
    {
      toolName: 'life-calendar',
      href: '/marketplace/life-calendar',
      gradient: 'bg-[var(--ink)]',
      iconName: 'CalendarClock',
      title: t('lifeCalendar'),
      description: t('lifeCalendarDescription'),
      color: 'gold',
      category: 'personal',
      requiresSubscription: true,
    },
    {
      toolName: 'findo',
      href: '/marketplace/findo',
      gradient: 'bg-[var(--ink)]',
      iconName: 'PackageSearch',
      title: t('findo'),
      description: t('findoDescription'),
      color: 'gold',
      category: 'personal',
      requiresSubscription: true,
    },
    {
      toolName: 'digital-receipt',
      href: '/marketplace/digital-receipt',
      gradient: 'bg-[var(--ink)]',
      iconName: 'FileCheck2',
      title: t('digitalReceipt'),
      description: t('digitalReceiptDescription'),
      color: 'gold',
      category: 'personal',
      requiresSubscription: true,
    },
    {
      toolName: 'neurobalance',
      href: '/marketplace/neurobalance',
      gradient: 'bg-[var(--ink)]',
      iconName: 'Waves',
      title: t('neurobalance'),
      description: t('neurobalanceDescription'),
      color: 'gold',
      category: 'wellness',
      requiresSubscription: true,
    },
    {
      toolName: 'aureya',
      href: '/marketplace/aureya',
      gradient: 'bg-[var(--ink)]',
      iconName: 'Stethoscope',
      title: t('aureya'),
      description: t('aureyaDescription'),
      color: 'gold',
      category: 'wellness',
      requiresSubscription: true,
    },
  ]
}
