import { StateCreator } from 'zustand'
import type { Agent } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/client'

export interface AgentSlice {
  agents: Agent[]
  selectedAgent: Agent | null
  isLoading: boolean
  error: string | null
  setAgents: (agents: Agent[]) => void
  setSelectedAgent: (agent: Agent | null) => void
  setError: (error: string | null) => void
  fetchAgents: () => Promise<void>
  createAgent: (agentData: Partial<Agent>) => Promise<Agent>
  updateAgent: (id: number, agentData: Partial<Agent>) => Promise<Agent>
  deleteAgent: (id: number) => Promise<void>
  uploadAvatar: (userId: string, file: File) => Promise<{ url: string; path: string }>
  generateAvatar: (prompt: string) => Promise<{ url: string; path: string }>
}

export const createAgentSlice: StateCreator<AgentSlice> = (set, get) => ({
  agents: [],
  selectedAgent: null,
  isLoading: false,
  error: null,
  setAgents: (agents) => set({ agents }),
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  setError: (error) => set({ error }),

  fetchAgents: async () => {
    try {
      set({ isLoading: true })
      const supabase = createClient()
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ agents: data })
    } catch (error) {
      set({ error: 'Failed to fetch agents' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  createAgent: async (agentData) => {
    try {
      set({ isLoading: true })
      const supabase = createClient()
      const { data, error } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single()

      if (error) throw error
      
      const { agents } = get()
      set({ agents: [data, ...agents] })
      return data
    } catch (error) {
      set({ error: 'Failed to create agent' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  updateAgent: async (id, agentData) => {
    try {
      set({ isLoading: true })
      const supabase = createClient()
      const { data, error } = await supabase
        .from('agents')
        .update(agentData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const { agents } = get()
      set({ 
        agents: agents.map(agent => 
          agent.id === id ? { ...agent, ...data } : agent
        )
      })
      return data
    } catch (error) {
      set({ error: 'Failed to update agent' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  deleteAgent: async (id) => {
    try {
      set({ isLoading: true })
      const supabase = createClient()
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id)

      if (error) throw error

      const { agents } = get()
      set({ agents: agents.filter(agent => agent.id !== id) })
    } catch (error) {
      set({ error: 'Failed to delete agent' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  uploadAvatar: async (userId: string, file: File) => {
    try {
      set({ isLoading: true })
      const supabase = createClient()
      const timestamp = Date.now()
      const filename = `${userId}/${timestamp}.png`

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('agent-avatar')
        .upload(filename, file, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase
        .storage
        .from('agent-avatar')
        .getPublicUrl(uploadData.path)

      return {
        url: publicUrl,
        path: uploadData.path
      }
    } catch (error) {
      set({ error: 'Failed to upload avatar' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  generateAvatar: async (prompt: string) => {
    try {
      set({ isLoading: true })
      const response = await fetch('/api/agents/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) throw new Error('Failed to generate avatar')
      const data = await response.json()
      return data
    } catch (error) {
      set({ error: 'Failed to generate avatar' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  }
}) 