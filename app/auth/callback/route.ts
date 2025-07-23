import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirectTo = requestUrl.searchParams.get('redirect') || '/'

    if (code) {
      const supabase = await createClient()
      
      // Exchange the code for a session
      const { data: { session }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (authError) {
        console.error('Auth error:', authError)
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
      }

      if (session?.user) {
        try {
          // Create response with redirect
          const response = NextResponse.redirect(new URL(redirectTo, request.url))

          // Set auth cookie
          await supabase.auth.setSession(session)

          // Sync user data
          const syncResponse = await fetch(new URL('/api/sync-user', request.url).toString(), {
            method: 'GET',
            headers: {
              'Cookie': request.headers.get('cookie') || '',
              'Authorization': `Bearer ${session.access_token}`
            },
          })

          if (!syncResponse.ok) {
            console.error('Failed to sync user:', await syncResponse.text())
          }

          return response
        } catch (error) {
          console.error('Error in callback:', error)
          return NextResponse.redirect(new URL(redirectTo, request.url))
        }
      }
    }

    // If we get here, something went wrong
    return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
  }
} 