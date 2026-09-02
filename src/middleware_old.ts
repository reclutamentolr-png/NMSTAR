import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ✅ 1. Pagine pubbliche esatte
  const publicPaths = ['/', '/login', '/register', '/privacy', '/terms', '/contact']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path)
  
  // ✅ 2. PERMETTI anche tutte le pagine che iniziano con /ref/ (es. /ref/IT-10000-Q)
  const isReferralPath = request.nextUrl.pathname.startsWith('/ref/')

  // Se non c'è utente, E non è una pagina pubblica, E non è un link referral -> reindirizza al login
  if (!user && !isPublicPath && !isReferralPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}