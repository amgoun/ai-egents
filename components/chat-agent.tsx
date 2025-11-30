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

  // Determine if we are in a transition state
  const isAgentSwitching = initialSelectedAgent && selectedAgent?.id !== initialSelectedAgent.id

  // Handle agent switching - clear messages and load correct session
  useEffect(() => {
    if (selectedAgent) {
      console.log('Agent changed, clearing messages and loading session for agent:', selectedAgent.id)
      // Clear current messages - though store logic handles this, we ensure UI state is clean
      // setMessages([]) -> Moved to store logic for atomic update
      
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
        setCurrentSession(null) // Ensure session is cleared if no existing chat
      }
    }
  }, [selectedAgent, recentChats, setCurrentSession, fetchMessages])

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
          agentId: selectedAgent.id,
          sessionId: currentSessionId || undefined
        }),
      })

      if (response.status === 401) {
        // Not authenticated → show modal and stop
        setAuthError(true)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Update session ID if needed
      if (data.sessionId) {
        if (currentSessionId !== data.sessionId) {
           // If we got a new session ID (and didn't have one before), refresh recent chats
           fetchRecentChats()
        }
        setCurrentSession(data.sessionId)
      }
      
      // Refresh chats if title was updated
      if (data.title) {
        fetchRecentChats()
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

  const handleNewChat = () => {
    setMessages([])
    setCurrentSession(null)
  }

  const handleSwitchChat = async (sessionId: number) => {
    try {
        setLoading(true)
        setCurrentSession(sessionId)
        await fetchMessages(sessionId)
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    } catch (error) {
        console.error('Error switching chat:', error)
        toast({
            title: 'Error',
            description: 'Failed to load chat history',
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

  const handleRenameChat = async (sessionId: number, newTitle: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })

      if (!response.ok) throw new Error('Failed to rename chat')
      
      // Refresh chat list
      await fetchRecentChats()
      
      toast({
        description: 'Chat renamed successfully'
      })
    } catch (error) {
      console.error('Error renaming chat:', error)
      toast({
        title: 'Error',
        description: 'Failed to rename chat',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteChat = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete chat')

      // If deleted current chat, clear messages
      if (currentSessionId === sessionId) {
        handleNewChat()
      }
      
      // Refresh chat list
      await fetchRecentChats()
      
      toast({
        description: 'Chat deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive'
      })
    }
  }

  // Filter chats for the current agent
  const agentChats = selectedAgent 
    ? recentChats.filter(chat => chat.agent.id === selectedAgent.id)
    : []

  // Render recent chats or empty state if no agent selected
  if (!selectedAgent && !initialSelectedAgent) {
    return <RecentChatsView 
      chats={recentChats}
      isLoading={isLoadingChats}
      onChatSelect={handleChatSelect}
      onBrowse={onBackToBrowse}
    />
  }

  // Force loading state or empty messages if we are switching agents
  // This prevents showing the old agent's chat while the new one loads
  const effectiveMessages = isAgentSwitching ? [] : messages
  const effectiveIsLoading = isLoading || !!isAgentSwitching

  // Render chat interface
  return <ChatInterface 
    agent={isAgentSwitching ? initialSelectedAgent! : selectedAgent!}
    messages={effectiveMessages}
    chats={agentChats}
    currentSessionId={currentSessionId}
    isLoading={effectiveIsLoading}
    message={message}
    session={initialSession}
    onMessageChange={setMessage}
    onSendMessage={handleSendMessage}
    onNewChat={handleNewChat}
    onSelectChat={handleSwitchChat}
    onRenameChat={handleRenameChat}
    onDeleteChat={handleDeleteChat}
    onKeyPress={handleKeyPress}
    onBack={onBackToBrowse}
    onEdit={onEditAgent}
    messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
    isAuthError={isAuthError}
    onAuthErrorClose={() => setAuthError(false)}
  />
}
