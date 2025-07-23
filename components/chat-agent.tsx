"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from '@/lib/supabase/client'
import { useToast } from "@/components/ui/use-toast"
import type { Agent, ChatMessage } from '@/lib/db/schema'
import type { ChatSession } from './chat/types'
import type { Session } from '@supabase/supabase-js'
import RecentChatsView from './chat/recent-chats-view'
import ChatInterface from './chat/chat-interface'
import { useChatStore } from '@/lib/store/chat-store'

interface ChatAgentProps {
  selectedAgent?: Agent | null
  onBackToBrowse?: () => void
  onEditAgent?: (agent: Agent) => void
  initialSession: Session
}

export default function ChatAgent({ 
  selectedAgent: initialSelectedAgent, 
  onBackToBrowse, 
  onEditAgent,
  initialSession
}: ChatAgentProps) {
  const [message, setMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Get state and actions from Zustand store
  const {
    messages,
    recentChats,
    currentSessionId,
    selectedAgent,
    isLoading,
    isLoadingChats,
    isAuthError,
    setMessages,
    addMessage,
    setCurrentSession,
    setSelectedAgent,
    setLoading,
    setAuthError,
    fetchMessages,
    fetchRecentChats,
    subscribeToMessages
  } = useChatStore()

  // Initialize selected agent from props
  useEffect(() => {
    if (initialSelectedAgent) {
      setSelectedAgent(initialSelectedAgent)
    }
  }, [initialSelectedAgent, setSelectedAgent])

  // Handle agent switching - clear messages and load correct session
  useEffect(() => {
    if (selectedAgent) {
      console.log('Agent changed, clearing messages and loading session for agent:', selectedAgent.id)
      // Clear current messages
      setMessages([])
      setCurrentSession(null)
      
      // Find existing session for this agent or start fresh
      const existingChat = recentChats.find(chat => chat.agent.id === selectedAgent.id)
      if (existingChat) {
        console.log('Found existing chat session:', existingChat.id)
        setCurrentSession(existingChat.id)
        fetchMessages(existingChat.id).catch((error: Error) => {
          console.error('Failed to load messages for existing session:', error)
        })
      } else {
        console.log('No existing session found for agent, starting fresh')
      }
    }
  }, [selectedAgent, recentChats, setMessages, setCurrentSession, fetchMessages])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load initial data
  useEffect(() => {
    fetchRecentChats().catch((error: Error) => {
      toast({
        title: 'Error',
        description: 'Failed to load recent chats',
        variant: 'destructive'
      })
    })
  }, [fetchRecentChats])

  // Subscribe to messages when session changes
  useEffect(() => {
    if (!currentSessionId) return
    const unsubscribe = subscribeToMessages(currentSessionId)
    return unsubscribe
  }, [currentSessionId, subscribeToMessages])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading || !selectedAgent) return

    setLoading(true)
    
    try {
      const messageToSend = message.trim()
      setMessage('') // Clear input immediately

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: messageToSend, 
          agentId: selectedAgent.id 
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Update session ID if needed
      if (data.sessionId) {
        setCurrentSession(data.sessionId)
      }

      // Add new messages to existing ones
      data.messages.forEach((msg: ChatMessage) => {
        addMessage(msg)
      })

    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleChatSelect = async (chat: ChatSession) => {
    try {
      setLoading(true)
      setSelectedAgent(chat.agent)
      setCurrentSession(chat.id)
      await fetchMessages(chat.id)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    } catch (error) {
      console.error('Error loading chat:', error)
      toast({
        title: 'Error',
        description: 'Failed to load chat history',
        variant: 'destructive'
      })
      // Reset state on error
      setSelectedAgent(null)
      setCurrentSession(null)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  // Render recent chats or empty state if no agent selected
  if (!selectedAgent) {
    return <RecentChatsView 
      chats={recentChats}
      isLoading={isLoadingChats}
      onChatSelect={handleChatSelect}
      onBrowse={onBackToBrowse}
    />
  }

  // Render chat interface
  return <ChatInterface 
    agent={selectedAgent}
    messages={messages}
    isLoading={isLoading}
    message={message}
    session={initialSession}
    onMessageChange={setMessage}
    onSendMessage={handleSendMessage}
    onKeyPress={handleKeyPress}
    onBack={onBackToBrowse}
    onEdit={onEditAgent}
    messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
    isAuthError={isAuthError}
    onAuthErrorClose={() => setAuthError(false)}
  />
}
