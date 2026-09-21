import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildVcardContent, type QrContentType, type VcardDestination } from '@/lib/qrPro'

interface QrDestinationRow {
  content_type: QrContentType
  destination: Record<string, string>
}

function buildTargetUrl(row: QrDestinationRow): string | null {
  const d = row.destination
  switch (row.content_type) {
    case 'link':
      return d.url || null
    case 'whatsapp': {
      if (!d.phone) return null
      const digits = d.phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
      return `https://wa.me/${digits}${d.message ? `?text=${encodeURIComponent(d.message)}` : ''}`
    }
    case 'phone':
      return d.phone ? `tel:${d.phone.replace(/\s/g, '')}` : null
    case 'sms':
      return d.phone ? `sms:${d.phone.replace(/\s/g, '')}${d.message ? `?body=${encodeURIComponent(d.message)}` : ''}` : null
    case 'email': {
      if (!d.email) return null
      const params = new URLSearchParams()
      if (d.subject) params.set('subject', d.subject)
      if (d.body) params.set('body', d.body)
      const query = params.toString()
      return `mailto:${d.email}${query ? `?${query}` : ''}`
    }
    // 'wifi' has no web target: its QR encodes the WIFI: payload directly and
    // never routes through this handler in normal use.
    default:
      return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const supabase = await createClient()
  const { data } = (await supabase
    .rpc('register_qr_pro_click', {
      p_code: code,
      p_referrer: request.headers.get('referer'),
      p_user_agent: request.headers.get('user-agent'),
    })
    .single()) as { data: QrDestinationRow | null }

  if (!data) {
    return NextResponse.redirect(new URL('/', request.url), 307)
  }

  if (data.content_type === 'vcard') {
    const vcard = data.destination as unknown as VcardDestination
    const vcf = buildVcardContent(vcard)
    const fileName = [vcard.firstName, vcard.lastName].filter(Boolean).join('-') || 'contact'
    return new NextResponse(vcf, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}.vcf"`,
      },
    })
  }

  const target = buildTargetUrl(data)
  if (!target) {
    return NextResponse.redirect(new URL('/', request.url), 307)
  }

  return NextResponse.redirect(target, 307)
}
