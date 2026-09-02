import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server'; // ✅ Importato NextResponse
import type { NextRequest } from 'next/server'; // ✅ Importato il tipo NextRequest
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export default function middleware(request: NextRequest) { // ✅ Tipizzato come NextRequest
  // Se il percorso è /admin, ignora la localizzazione e prosegui normalmente
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next(); // ✅ Restituisce una risposta valida anziché undefined
  }
  
  // Applica la logica di internazionalizzazione
  return intlMiddleware(request);
}

export const config = {
  // Ignora: api, _next, favicon.ico e file con estensioni di immagini/asset
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|admin).*)'
  ]
};