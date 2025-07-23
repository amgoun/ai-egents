import { StateCreator } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export interface AuthSlice {
  session: any | null
  isLoading: boolean
  isAuthError: boolean
  setSession: (session: any) => void
  setAuthError: (error: boolean) => void
  checkSession: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  session: null,
  isLoading: false,
  isAuthError: false,
  setSession: (session) => set({ session }),
  setAuthError: (error) => set({ isAuthError: error }),
  
  checkSession: async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    set({ session })
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true })
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      set({ session: data.session })
    } catch (error) {
      set({ isAuthError: true })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true })
      const supabase = createClient()
      await supabase.auth.signOut()
      set({ session: null })
    } catch (error) {
      throw error
    } finally {
      set({ isLoading: false })
    }
  }
}) 