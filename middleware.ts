import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export default function middleware(request: Request) {
  // Se il percorso è /admin, ignora il middleware e lascia che Next.js lo gestisca normalmente
  if (request.url.includes('/admin')) {
    return;
  }
  
  // Altrimenti, applica la logica di internazionalizzazione
  return intlMiddleware(request);
}

export const config = {
  // Ignora: api, _next (file statici), _vercel, admin, e file con estensione (es. .jpg, .css)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|admin).*)']
};