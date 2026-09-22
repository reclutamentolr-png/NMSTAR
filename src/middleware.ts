import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from '../i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

// Mirrors src/lib/marketplaceAccess.ts REQUIRES_SUBSCRIPTION — duplicated
// here (not imported) because middleware runs in the Edge runtime, which
// can't pull in that file's Supabase-typed server code. Keep the two lists
// in sync when a tool's subscription requirement changes.
const REQUIRES_SUBSCRIPTION = [
  'link-in-bio',
  'memolife',
  'neurobalance',
  'svat',
  'offermaker',
  'qr-code-pro',
  'life-calendar',
  'findo',
  'digital-receipt',
  'aureya',
];

// Extracts the tool name from a path like /marketplace/memolife/new or
// /en/marketplace/memolife/new, after stripping an optional locale prefix.
function extractToolName(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] && locales.includes(segments[0])) {
    segments.shift();
  }
  if (segments[0] === 'marketplace' && segments[1]) {
    return segments[1];
  }
  return null;
}

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-side enforcement of the subscription-required tools: every UI
  // entry point (marketplace grid, dashboard tool list) is supposed to
  // hide/disable these for a non-active user, but that's presentation
  // only — someone who navigates straight to the URL (bookmark, typed,
  // shared link) bypassed all of it before this check existed. This is
  // the actual access-control boundary; the UI-level hiding is just a
  // courtesy on top of it. Free/unauthenticated visitors are bounced to
  // /dashboard, where both "Abbonati ora" and "Attiva tramite Voucher"
  // are one click away.
  const toolName = extractToolName(request.nextUrl.pathname);
  if (user && toolName && REQUIRES_SUBSCRIPTION.includes(toolName)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_expires_at')
      .eq('id', user.id)
      .single();

    const isActive =
      profile?.subscription_status === 'active' &&
      (!profile.subscription_expires_at || new Date(profile.subscription_expires_at).getTime() > Date.now());

    if (!isActive) {
      const segments = request.nextUrl.pathname.split('/').filter(Boolean);
      const localePrefix = segments[0] && locales.includes(segments[0]) ? `/${segments[0]}` : '';
      const redirectUrl = new URL(`${localePrefix}/dashboard`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

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
