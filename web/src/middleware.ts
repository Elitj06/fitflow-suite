import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/api/webhooks', '/api/auth', '/api/v1']
const ALWAYS_ALLOW = ['/api/auth/callback', '/onboarding']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() which handles token refresh automatically,
  // then getUser() to validate the session server-side.
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = session
    ? await supabase.auth.getUser(session.access_token)
    : { data: { user: null as null } }
  const pathname = request.nextUrl.pathname

  // Always allow auth callback and onboarding
  if (ALWAYS_ALLOW.some(r => pathname.startsWith(r))) return supabaseResponse

  // Allow public routes and webhooks
  const isPublic = PUBLIC_ROUTES.some(route =>
    pathname === route ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/v1')
  )
  if (isPublic) return supabaseResponse

  // Redirect unauthenticated users to login
  if (!user && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // API routes return 401
  if (!user && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
