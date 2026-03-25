import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const SAFE_PATH = /^\/[a-zA-Z0-9\/_\-]*$/
  const rawNext = searchParams.get('next') ?? '/trainer'
  const next = SAFE_PATH.test(rawNext) ? rawNext : '/trainer'
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle errors from Supabase
  if (errorParam) {
    console.error('Auth callback error:', errorParam, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || errorParam)}`)
  }

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirect to next page (default: /onboarding for new users, /trainer for existing)
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Exchange code error:', error)
  }

  // Auth error - redirect to login with message
  return NextResponse.redirect(`${origin}/login?error=Link+de+confirmacao+invalido+ou+expirado.+Tente+se+cadastrar+novamente.`)
}
