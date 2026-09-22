// A link URL typed without a protocol (e.g. "www.example.com") renders as a
// browser-resolved RELATIVE href, which on the bio page (served under
// /[locale]/ref/[code]/bio) silently turns into
// /[locale]/ref/[code]/www.example.com instead of leaving the site — this
// is what looked like "the link prepends my referral code". Normalizing at
// both save time and render time closes it for new and already-stored data.
export function normalizeExternalUrl(raw: string | null | undefined): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''
  if (/^(https?:\/\/|mailto:|tel:|\/\/)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function stripKnownPrefix(raw: string): string {
  return raw.replace(/^(https?:\/\/|mailto:|tel:|whatsapp:|\/\/)/i, '').trim()
}

// The correct scheme depends on what kind of link it is — a plain
// normalizeExternalUrl (always https://) is wrong for email/phone/whatsapp,
// which is exactly the bug reported: an email typed as "info@site.com" was
// getting "https://" prepended instead of "mailto:", same for phone numbers
// vs "tel:". Also strips any prefix the value may already carry (old data,
// or a value copy-pasted with one already attached) before re-deriving the
// right one, so this never double-prefixes.
export function normalizeLinkUrl(icon: string | null | undefined, raw: string | null | undefined): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''
  const bare = stripKnownPrefix(trimmed)

  switch (icon) {
    case 'email':
      return bare ? `mailto:${bare}` : ''
    case 'phone': {
      const digits = bare.replace(/[^\d+]/g, '')
      return digits ? `tel:${digits}` : ''
    }
    case 'whatsapp': {
      // wa.me expects the full international number as digits only, no
      // "+", spaces or dashes.
      const digitsOnly = bare.replace(/\D/g, '')
      return digitsOnly ? `https://wa.me/${digitsOnly}` : ''
    }
    default:
      return normalizeExternalUrl(trimmed)
  }
}

// The inverse of normalizeLinkUrl's prefixing, used to populate the editor's
// input with a plain value ("info@site.com", "+39 333 1234567") instead of
// the stored "mailto:"/"tel:"/"https://wa.me/" form — including cleaning up
// values saved before this fix existed.
export function displayLinkValue(icon: string | null | undefined, raw: string | null | undefined): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''
  if (icon === 'email' || icon === 'phone' || icon === 'whatsapp') {
    return stripKnownPrefix(trimmed)
  }
  return trimmed
}
