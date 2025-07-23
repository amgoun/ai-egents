import { StateCreator } from 'zustand'
import type { ChatMessage, ChatSession } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/client'

export interface ChatSlice {
  messages: ChatMessage[]
  recentChats: ChatSession[]
  currentSessionId: number | null
  isLoading: boolean
  error: string | null
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setRecentChats: (chats: ChatSession[]) => void
  setCurrentSession: (sessionId: number | null) => void
  setError: (error: string | null) => void
  fetchMessages: (sessionId: number) => Promise<void>
  fetchRecentChats: () => Promise<void>
  sendMessage: (content: string, agentId: number) => Promise<void>
  subscribeToMessages: (sessionId: number) => () => void
}

export const createChatSlice: StateCreator<ChatSlice> = (set, get) => ({
  messages: [],
  recentChats: [],
  currentSessionId: null,
  isLoading: false,
  error: null,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  setRecentChats: (chats) => set({ recentChats: chats }),
  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
  setError: (error) => set({ error }),

  fetchMessages: async (sessionId) => {
    try {
      set({ isLoading: true })
      const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')
      const messages = await response.json()
      set({ messages })
    } catch (error) {
      set({ error: 'Failed to fetch messages' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  fetchRecentChats: async () => {
    try {
      set({ isLoading: true })
      const response = await fetch('/api/chat/sessions')
      if (!response.ok) throw new Error('Failed to fetch chats')
      const chats = await response.json()
      set({ recentChats: chats })
    } catch (error) {
      set({ error: 'Failed to fetch recent chats' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  sendMessage: async (content: string, agentId: number) => {
    try {
      set({ isLoading: true })
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: content, 
          agentId 
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')
      const data = await response.json()

      // Update session ID if needed
      if (data.sessionId) {
        set({ currentSessionId: data.sessionId })
      }

      // Update messages
      set({ messages: data.messages })
    } catch (error) {
      set({ error: 'Failed to send message' })
      throw error
    } finally {
      set({ isLoading: false })
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
}) 