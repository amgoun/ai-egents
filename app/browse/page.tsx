import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BrowseAgentPage from "@/components/browse-agent-page"
import type { Agent } from "@/lib/db/schema"

export default async function BrowsePage() {
  console.log('BrowsePage: Starting page load')
  
  const supabase = await createClient()
  console.log('BrowsePage: Created supabase client')
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log('BrowsePage: Session result:', { session: session?.user?.id, error: sessionError })

  if (!session) {
    console.log('BrowsePage: No session, redirecting to login')
    redirect("/login")
  }

  console.log('BrowsePage: User authenticated, ID:', session.user.id)

  // Fetch agents from database
  const { data: rawAgents, error } = await supabase
    .from('agents')
    .select('*')
    .eq('creator_id', session.user.id)
    .order('created_at', { ascending: false })

  console.log('Database query result:', { rawAgents, error })
  console.log('Raw agents type:', typeof rawAgents)
  console.log('Is rawAgents array?', Array.isArray(rawAgents))

  if (error) {
    console.error('Error fetching agents:', error)
    return <BrowseAgentPage initialAgents={[]} initialSession={session} />
  }

  // Ensure we have an array
  if (!Array.isArray(rawAgents)) {
    console.warn('rawAgents is not an array, using empty array')
    return <BrowseAgentPage initialAgents={[]} initialSession={session} />
  }

  // Transform snake_case to camelCase for frontend
  const agents: Agent[] = rawAgents.map(agent => ({
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
  }))

  console.log('Transformed agents:', agents)
  console.log('Agents count:', agents.length)
  console.log('BrowsePage: Rendering component with agents and session')

  return <BrowseAgentPage initialAgents={agents} initialSession={session} />
} 