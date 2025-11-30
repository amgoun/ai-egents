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
    const { data: { user } } = await supabase.auth.getUser()
    // Adapt user to session-like structure if needed, or just store user
    // The slice defines session: Session | null. 
    // If we want to strictly follow Session type, we might need getSession but validated by getUser?
    // Or just update the type to hold User?
    // For now, let's try to get the session IF getUser succeeds.
    if (user) {
        const { data: { session } } = await supabase.auth.getSession()
        set({ session })
    } else {
        set({ session: null })
    }
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