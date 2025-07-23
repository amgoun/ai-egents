import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Get the user from Supabase
  const { data: { user } } = await supabase.auth.getUser()

  // If accessing protected routes without auth, redirect to login
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If accessing login while authenticated, redirect to home
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return res
}

export const config = {
  matcher: [
    '/browse/:path*',
    // '/api/chat/:path*',     // Temporarily disabled
    // '/api/agents/:path*',   // Temporarily disabled
    '/login'
  ],
}