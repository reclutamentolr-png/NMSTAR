import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from '../i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Ignora: api, short link /o/* e /q/*, /billing (pagina non localizzata,
  // fuori da [locale] — senza questa esclusione next-intl la riscrive come
  // /it/billing, che non esiste, causando 404 anche sulla pagina di
  // successo pagamento Stripe), _next, favicon.ico e file con estensioni di
  // immagini/asset
  matcher: [
    '/((?!api|o/|q/|billing|_next/static|_next/image|favicon.ico|.*\\..*).*)'
  ]
};
