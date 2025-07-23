"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

export const AuthButton = () => {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }
    
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const handleSignIn = () => {
    const returnTo = encodeURIComponent(pathname)
    router.push(`/login?redirectTo=${returnTo}`)
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full">
        <div className="w-5 h-5 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
      </Button>
    )
  }

  if (!session) {
    return (
      <Button 
        onClick={handleSignIn}
        variant="default"
        className="rounded-full px-4"
      >
        Sign In
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full">
          <Avatar className="w-8 h-8">
            <AvatarImage 
              src={session.user.user_metadata?.avatar_url || ''} 
              alt={session.user.email} 
            />
            <AvatarFallback>
              {session.user.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user.user_metadata?.name || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AuthButton
