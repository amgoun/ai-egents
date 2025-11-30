import { create } from 'zustand'
import type { Agent, ChatMessage } from '@/lib/db/schema'
import type { ChatSession } from '@/components/chat/types'
import { createClient } from '@/lib/supabase/client'

interface ChatStore {
  messages: ChatMessage[]
  recentChats: ChatSession[]
  currentSessionId: number | null
  selectedAgent: Agent | null
  isLoading: boolean
  isLoadingChats: boolean
  isAuthError: boolean
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setRecentChats: (chats: ChatSession[]) => void
  setCurrentSession: (sessionId: number | null) => void
  setSelectedAgent: (agent: Agent | null) => void
  setLoading: (loading: boolean) => void
  setLoadingChats: (loading: boolean) => void
  setAuthError: (error: boolean) => void
  fetchMessages: (sessionId: number) => Promise<void>
  fetchRecentChats: () => Promise<void>
  subscribeToMessages: (sessionId: number) => () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  recentChats: [],
  currentSessionId: null,
  selectedAgent: null,
  isLoading: false,
  isLoadingChats: false,
  isAuthError: false,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  setRecentChats: (chats) => set({ recentChats: chats }),
  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
  setSelectedAgent: (agent) => set((state) => {
    // Only clear messages if the agent is actually changing
    if (state.selectedAgent?.id !== agent?.id) {
      return { 
        selectedAgent: agent, 
        messages: [], 
        currentSessionId: null 
      }
    }
    return { selectedAgent: agent }
  }),
  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingChats: (loading) => set({ isLoadingChats: loading }),
  setAuthError: (error) => set({ isAuthError: error }),
  fetchMessages: async (sessionId) => {
    try {
      const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages')
      }

      if (!Array.isArray(data)) {
        console.error('Invalid messages data:', data)
        set({ messages: [] })
        return
      }

      set({ messages: data })
    } catch (error) {
      console.error('Error fetching messages:', error)
      set({ messages: [] })
    }
  },
  fetchRecentChats: async () => {
    try {
      console.log('fetchRecentChats: Starting request')
      set({ isLoadingChats: true })
      
      console.log('fetchRecentChats: Making fetch request to /api/chat/sessions')
      const response = await fetch('/api/chat/sessions')
      
      console.log('fetchRecentChats: Response received')
      console.log('Response status:', response.status)
      console.log('Response statusText:', response.statusText)
      console.log('Response ok:', response.ok)
      console.log('Response type:', response.type)
      console.log('Response url:', response.url)
      
      // Log the raw response for debugging
      const responseText = await response.text()
      console.log('Raw chat sessions response length:', responseText.length)
      console.log('Raw chat sessions response (first 500 chars):', responseText.substring(0, 500))
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText)
        console.error('Error response body:', responseText)
        set({ recentChats: [] })
        return
      }

      // Try to parse JSON
      let data
      try {
        console.log('fetchRecentChats: Attempting to parse JSON')
        data = JSON.parse(responseText)
        console.log('fetchRecentChats: JSON parsed successfully')
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Raw response that failed to parse:', responseText)
        console.error('Response text type:', typeof responseText)
        console.error('Response text charAt(0):', responseText.charAt(0))
        console.error('Response text charCodeAt(0):', responseText.charCodeAt(0))
        set({ recentChats: [] })
        return
      }

      if (!data || !Array.isArray(data.chats)) {
        console.error('Invalid chats data structure:', data)
        console.error('data type:', typeof data)
        console.error('data.chats type:', typeof data?.chats)
        console.error('data.chats isArray:', Array.isArray(data?.chats))
        set({ recentChats: [] })
        return
      }

      console.log('Parsed chats data:', data.chats)
      console.log('Number of chats:', data.chats.length)
      set({ recentChats: data.chats })
    } catch (error) {
      console.error('Error in fetchRecentChats:', error)
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      set({ recentChats: [] })
    } finally {
      console.log('fetchRecentChats: Completed')
      set({ isLoadingChats: false })
    }
  },
  subscribeToMessages: (sessionId) => {
    const supabase = createClient()
    const subscription = supabase
      .channel(`chat_messages_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          const { messages } = get()
          const exists = messages.some(msg => msg.id === newMessage.id)
          if (!exists) {
            set({ messages: [...messages, newMessage] })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }
})) 