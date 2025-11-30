import type { Agent, ChatMessage, ChatSession as DbChatSession } from '@/lib/db/schema'

// Extend the database ChatSession type to include the agent
export interface ChatSession extends Omit<DbChatSession, 'agentId'> {
  agent: Agent
  agent_id: number
  created_at: string
}

// Props for the chat interface component
export interface ChatInterfaceProps {
  agent: Agent
  messages: ChatMessage[]
  chats: ChatSession[]
  currentSessionId: number | null
  isLoading: boolean
  message: string
  session: any
  onMessageChange: (message: string) => void
  onSendMessage: () => void
  onNewChat: () => void
  onSelectChat: (sessionId: number) => void
  onRenameChat: (sessionId: number, newTitle: string) => Promise<void>
  onDeleteChat: (sessionId: number) => Promise<void>
  onKeyPress: (e: React.KeyboardEvent) => void
  onBack?: () => void
  onEdit?: (agent: Agent) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
  isAuthError: boolean
  onAuthErrorClose: () => void
} 