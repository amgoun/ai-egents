"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Sidebar from "@/components/sidebar"
import CreateAgent from "@/components/create-agent"
import BrowseAgent from "@/components/browse-agent"
import ChatAgent from "@/components/chat-agent"
import TopNavbar from "@/components/top-navbar"
import { createClient } from '@/lib/supabase/client'
import type { Agent } from '@/lib/db/schema'

export default function Home() {
  const [activeTab, setActiveTab] = useState("create")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [agents, setAgents] = useState<any[]>([]) // Keep as any[] for database results
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<any>(null)

  // Transform database agent format to schema Agent format
  const transformAgent = (dbAgent: any): Agent => ({
    id: dbAgent.id,
    name: dbAgent.name,
    description: dbAgent.description,
    avatarUrl: dbAgent.avatar_url,
    avatarPath: dbAgent.avatar_path,
    avatarResourceId: dbAgent.avatar_resource_id,
    imageDescription: dbAgent.image_description,
    visibility: dbAgent.visibility,
    universe: dbAgent.universe,
    topicExpertise: dbAgent.topic_expertise,
    creatorId: dbAgent.creator_id,
    modelProvider: dbAgent.model_provider,
    modelVersion: dbAgent.model_version,
    temperature: dbAgent.temperature ?? 70,
    systemPrompt: dbAgent.system_prompt,
    createdAt: new Date(dbAgent.created_at),
    updatedAt: new Date(dbAgent.updated_at),
    isVerified: dbAgent.is_verified ?? false,
    metadata: dbAgent.metadata
  })

  useEffect(() => {
    const supabase = createClient()

    // Function to fetch agents
    const fetchAgents = async () => {
      try {
        setIsLoading(true)
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        const { data: { session: userSession } } = await supabase.auth.getSession()
        setCurrentUserId(user?.id)
        setSession(userSession)

        // Fetch agents that are either public OR belong to the current user
        const { data: agents, error } = await supabase
          .from('agents')
          .select(`
            id,
            name,
            description,
            avatar_url,
            visibility,
            universe,
            topic_expertise,
            creator_id,
            model_provider,
            model_version,
            created_at
          `)
          .or(`visibility.eq.public,creator_id.eq.${user?.id}`)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching agents:', error)
          throw error // Add this to see the full error
        }

        if (agents) {
          console.log('Fetched agents:', agents)
          setAgents(agents)
        }
      } catch (error) {
        console.error('Error in fetchAgents:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchAgents()

    // Set up real-time subscription for agents
    const agentsSubscription = supabase
      .channel('public:agents')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all changes
          schema: 'public',
          table: 'agents'
        },
        async (payload) => {
          console.log('Agent change received:', payload)
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            const newAgent = payload.new as any
            // Add if public or belongs to current user
            if (newAgent.visibility === 'public' || newAgent.creator_id === currentUserId) {
              setAgents(current => [newAgent, ...current])
            }
          } else if (payload.eventType === 'DELETE') {
            setAgents(current => current.filter(agent => agent.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            const updatedAgent = payload.new as any
            // Update if public or belongs to current user
            if (updatedAgent.visibility === 'public' || updatedAgent.creator_id === currentUserId) {
              setAgents(current => 
                current.map(agent => 
                  agent.id === updatedAgent.id ? updatedAgent : agent
                )
              )
            } else {
              // Remove if no longer public and doesn't belong to user
              setAgents(current => 
                current.filter(agent => agent.id !== updatedAgent.id)
              )
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Agents subscription status:', status)
      })

    // Cleanup function
    return () => {
      console.log('Cleaning up subscriptions')
      agentsSubscription.unsubscribe()
    }
  }, []) // Empty dependency array - only run on mount

  const handleAgentSelect = (agent: any) => {
    const transformedAgent = transformAgent(agent)
    setSelectedAgent(transformedAgent)
    setActiveTab("chat")
  }

  const handleBackToBrowse = () => {
    setSelectedAgent(null)
    setActiveTab("browse")
  }

  const handleEditAgent = (agent: Agent) => {
    setActiveTab("create")
    // You could pass the agent data to CreateAgent component for editing
  }

  const handleAgentCreated = (newAgent: Agent) => {
    // Add the new agent to the list immediately
    setAgents(current => [newAgent, ...current])
    // Switch to browse tab
    setActiveTab("browse")
  }

  const renderContent = () => {
    switch (activeTab) {
      case "create":
        return <CreateAgent onAgentCreated={handleAgentCreated} />
      case "browse":
        return (
          <BrowseAgent 
            agents={agents} 
            currentUserId={currentUserId} 
            onAgentSelect={handleAgentSelect}
            isLoading={isLoading}
          />
        )
      case "chat":
        return (
          <ChatAgent 
            selectedAgent={selectedAgent} 
            onBackToBrowse={handleBackToBrowse} 
            onEditAgent={handleEditAgent} 
            initialSession={session}
          />
        )
      default:
        return <CreateAgent onAgentCreated={handleAgentCreated} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 overflow-hidden">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
