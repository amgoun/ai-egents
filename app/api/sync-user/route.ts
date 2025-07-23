import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    })

    if (existingUser) {
      return NextResponse.json({
        message: 'User already exists in database',
        user: existingUser
      })
    }

    // Create the user in our database
    const newUser = await db.insert(users).values({
      id: session.user.id,
      email: session.user.email!,
      name: session.user.user_metadata?.name || null,
      avatarUrl: session.user.user_metadata?.avatar_url || null,
      role: 'user' // default role
    }).returning()

    return NextResponse.json({
      message: 'User synced successfully',
      user: newUser[0]
    })

  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 