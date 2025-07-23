import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  const payload = await request.json()
  
  // Verify this is a Supabase request
  // You should add proper webhook secret verification in production
  try {
    if (payload.type === 'INSERT' && payload.table === 'users') {
      const supabase = await createClient()
      
      // Get the user data from Supabase auth
      const { data: { user } } = await supabase.auth.admin.getUserById(payload.record.id)
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Check if user already exists in our database
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, user.id)
      })

      if (existingUser) {
        return NextResponse.json({ message: 'User already exists' })
      }

      // Insert the user into our database
      await db.insert(users).values({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        role: 'user', // default role
      })

      return NextResponse.json({ message: 'User created successfully' })
    }
    
    return NextResponse.json({ message: 'Webhook received' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle Supabase auth callback
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the user data after successful authentication
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user already exists in our database
        const existingUser = await db.query.users.findFirst({
          where: eq(users.id, user.id)
        })

        if (!existingUser) {
          // Insert the user into our database
          await db.insert(users).values({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || null,
            avatarUrl: user.user_metadata?.avatar_url || null,
            role: 'user', // default role
          })
        }
      }

      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Return to login page if there's an error
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
} 