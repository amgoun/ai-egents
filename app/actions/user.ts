'use server'

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function syncUser(userId: string) {
  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (existingUser) {
      return { success: true, user: existingUser }
    }

    // Get user data from Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)

    if (!user) {
      return { success: false, error: 'User not found in Supabase' }
    }

    // Create user in database
    const newUser = await db.insert(users).values({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
      role: 'user'
    }).returning()

    return { success: true, user: newUser[0] }
  } catch (error) {
    console.error('Error syncing user:', error)
    return { success: false, error: 'Failed to sync user' }
  }
}

export async function getUserRole(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })
    return user?.role || null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
} 