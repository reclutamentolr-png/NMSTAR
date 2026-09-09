import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['it', 'en']
const DEFAULT_LOCALE = 'it'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ✅ Se il percorso ha già un locale valido, lascia passare
  const firstSegment = pathname.split('/')[1]
  if (LOCALES.includes(firstSegment)) {
    return NextResponse.next()
  }

  // ✅ Altrimenti aggiungi il locale default: /admin → /it/admin
  const url = request.nextUrl.clone()
  url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Esclude API, file statici, next internals e qualsiasi percorso con un punto
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}