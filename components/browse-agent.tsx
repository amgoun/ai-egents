'use client'

import type { Session } from '@supabase/supabase-js'
import type { Agent } from '@/lib/db/schema'
import AgentCard from './agent/agent-card'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface BrowseAgentProps {
  // For server-side usage (browse page)
  initialAgents?: Agent[]
  initialSession?: Session
  // For client-side usage (main page)
  agents?: any[]
  currentUserId?: string
  onAgentSelect?: (agent: any) => void
  onAgentEdit?: (agent: Agent) => void
  onAgentDeleted?: (agentId: number) => void
  isLoading?: boolean
}

export default function BrowseAgent({ 
  initialAgents = [], 
  initialSession,
  agents = [],
  currentUserId,
  onAgentSelect,
  onAgentEdit,
  onAgentDeleted,
  isLoading = false 
}: BrowseAgentProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null)
  const [deletingAgentId, setDeletingAgentId] = useState<number | null>(null)

  console.log('BrowseAgent received initialAgents:', initialAgents)
  console.log('BrowseAgent received agents:', agents)
  console.log('BrowseAgent received session:', initialSession?.user?.id)
  console.log('BrowseAgent received currentUserId:', currentUserId)

  // Use whichever agents array has data
  const agentsList = initialAgents.length > 0 ? initialAgents : agents
  console.log('BrowseAgent using agents list:', agentsList.length)

  const handleEdit = (agent: Agent) => {
    console.log('Edit agent:', agent.id)
    if (onAgentEdit) {
      onAgentEdit(agent)
    }
  }

  const handleDeleteClick = (agent: Agent) => {
    setAgentToDelete(agent)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return

    try {
      setDeletingAgentId(agentToDelete.id)
      setDeleteDialogOpen(false)
      
      const response = await fetch(`/api/agents/${agentToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete agent')
      }

      toast.success('Agent deleted successfully')
      
      // Notify parent component
      if (onAgentDeleted) {
        onAgentDeleted(agentToDelete.id)
      }
      
      setAgentToDelete(null)
    } catch (error) {
      console.error('Error deleting agent:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete agent')
    } finally {
      setDeletingAgentId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setAgentToDelete(null)
  }

  // Ensure unauthenticated users are redirected to login before chatting
  const handleChatClick = (agent: any) => {
    const isLoggedIn = Boolean(initialSession?.user?.id || currentUserId)
    if (!isLoggedIn) {
      // Preserve return path; adjust if you have a dedicated chat route
      window.location.href = '/login?redirectTo=/'
      return
    }
    if (onAgentSelect) {
      onAgentSelect(agent)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">My Agents</h2>
        </div>
        
        {/* Loading Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading agents...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">My Agents</h2>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {agentsList.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">You haven't created any agents yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Click "Create Agent" in the top right to get started,
                  or use the button below.
                </p>
                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Go to Home to create a new agent
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {agentsList.map((agent) => {
                  console.log('🔄 Processing agent for transformation:', {
                    id: agent.id,
                    name: agent.name,
                    raw_avatar_url: agent.avatar_url,
                    hasTopicExpertise: !!agent.topicExpertise
                  })
                  
                  // Transform agent data if needed (from main page format to expected format)
                  const transformedAgent = agent.topicExpertise ? agent : {
                    id: agent.id,
                    name: agent.name,
                    description: agent.description,
                    avatarUrl: agent.avatar_url,
                    avatarPath: agent.avatar_path,
                    avatarResourceId: agent.avatar_resource_id,
                    imageDescription: agent.image_description,
                    visibility: agent.visibility,
                    universe: agent.universe,
                    topicExpertise: agent.topic_expertise,
                    creatorId: agent.creator_id,
                    modelProvider: agent.model_provider,
                    modelVersion: agent.model_version,
                    temperature: agent.temperature ?? 70,
                    systemPrompt: agent.system_prompt,
                    createdAt: new Date(agent.created_at),
                    updatedAt: new Date(agent.updated_at),
                    isVerified: agent.is_verified ?? false,
                    metadata: agent.metadata
                  }

                  console.log('✅ Transformed agent:', {
                    id: transformedAgent.id,
                    name: transformedAgent.name,
                    avatarUrl: transformedAgent.avatarUrl,
                    avatarPath: transformedAgent.avatarPath
                  })

                  const isOwner = transformedAgent.creatorId === (initialSession?.user?.id || currentUserId)
                  const isDeleting = deletingAgentId === transformedAgent.id

                  return (
                    <AgentCard
                      key={agent.id}
                      agent={transformedAgent}
                      isOwner={isOwner}
                      isDeleting={isDeleting}
                      onEdit={() => handleEdit(transformedAgent)}
                      onChat={() => handleChatClick(agent)}
                      onDelete={() => handleDeleteClick(transformedAgent)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agentToDelete?.name}"? This action cannot be undone.
              All chat history and associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
