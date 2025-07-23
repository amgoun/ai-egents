'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error logging in:', error)
      toast({
        title: 'Error',
        description: 'Failed to log in. Please check your credentials.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Card>
  )
} 