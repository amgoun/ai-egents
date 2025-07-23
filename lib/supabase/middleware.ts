import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh the auth token
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Only protect chat and create agent API routes
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/api/chat') ||
    request.nextUrl.pathname.startsWith('/api/agents/create')

  if (isProtectedRoute && !session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  return supabaseResponse
}