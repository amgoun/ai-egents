'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const redirectTo = formData.get('redirectTo') as string || '/'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      data: {
        redirectTo
      }
    }
  })

  if (error) {
    return {
      error: error.message
    }
  }

  return {
    message: "Check your email for the magic link"
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirect=/dashboard`
    }
  })

  if (error) {
    return {
      error: error.message
    }
  }

  return {
    message: "Check your email for the magic link"
  }
}

export async function signOut() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return {
      error: error.message
    }
  }

  return data
}

export async function signInWithGithub() {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return {
      error: error.message
    }
  }

  return data
}