'use client'

import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Agent } from '@/lib/db/schema'
import BrowseAgent from './browse-agent'
import CreateAgent from './create-agent'
import { toast } from 'sonner'

interface BrowseAgentPageProps {
  initialAgents: Agent[]
  initialSession: Session
}

export default function BrowseAgentPage({ initialAgents, initialSession }: BrowseAgentPageProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [view, setView] = useState<'browse' | 'edit'>('browse')
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)

  const handleAgentEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setView('edit')
  }

  const handleAgentDeleted = (agentId: number) => {
    // Remove the agent from the list after successful deletion
    setAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentId))
  }

  const handleAgentUpdated = (updatedAgent: Agent) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      )
    )
    setView('browse')
    setEditingAgent(null)
    toast.success('Agent updated successfully')
  }

  const handleBackToBrowse = () => {
    setView('browse')
    setEditingAgent(null)
  }

  if (view === 'edit' && editingAgent) {
    return (
      <div className="h-full">
        <CreateAgent 
          editingAgent={editingAgent}
          onAgentUpdated={handleAgentUpdated}
          onCancel={handleBackToBrowse}
        />
      </div>
    )
  }

  return (
    <BrowseAgent
      initialAgents={agents}
      initialSession={initialSession}
      onAgentEdit={handleAgentEdit}
      onAgentDeleted={handleAgentDeleted}
    />
  )
} 