import { createClient } from '@/lib/supabase/server'
import { deleteAgentAvatar } from '@/lib/supabase/storage'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agentId = parseInt(id)
    
    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = await createClient()

    // Get current session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, check if the agent exists and belongs to the user
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('creator_id', user.id)
      .single()

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      )
    }

    // Delete avatar from storage if it exists
    if (agent.avatar_path) {
      try {
        await deleteAgentAvatar(agent.avatar_path)
      } catch (avatarError) {
        console.error('Failed to delete avatar:', avatarError)
        // Continue with agent deletion even if avatar deletion fails
      }
    }

    // Delete related data first (due to foreign key constraints)
    console.log(`🗑️ Starting deletion process for agent ${agentId}`)
    
    // Delete token_usage records first (if table exists)
    try {
      const { error: tokenUsageError } = await supabase
        .from('token_usage')
        .delete()
        .eq('agent_id', agentId)
      
      if (tokenUsageError && tokenUsageError.code !== 'PGRST116') {
        console.warn('⚠️ Error deleting token usage (table may not exist):', tokenUsageError)
      } else {
        console.log('✅ Deleted token usage records')
      }
    } catch (e) {
      console.warn('⚠️ Token usage table may not exist, skipping')
    }
    
    // First, get all session IDs for this agent
    const { data: chatSessions, error: sessionsQueryError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('agent_id', agentId)

    if (sessionsQueryError) {
      console.error('❌ Error fetching chat sessions:', sessionsQueryError)
      // Don't fail, continue with deletion
    } else if (chatSessions && chatSessions.length > 0) {
      console.log(`📝 Found ${chatSessions.length} chat sessions to delete`)
      // Extract session IDs
      const sessionIds = chatSessions.map(session => session.id)
      
      // Delete chat messages for these sessions
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .in('session_id', sessionIds)

      if (messagesError) {
        console.error('❌ Error deleting chat messages:', messagesError)
        // Don't fail, continue
      } else {
        console.log('✅ Deleted chat messages')
      }
    }

    // Delete chat sessions for this agent
    const { error: sessionsError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('agent_id', agentId)

    if (sessionsError) {
      console.error('❌ Error deleting chat sessions:', sessionsError)
      // Don't fail, continue
    } else {
      console.log('✅ Deleted chat sessions')
    }

    // Delete training data for this agent
    const { error: trainingDataError } = await supabase
      .from('agent_training_data')
      .delete()
      .eq('agent_id', agentId)

    if (trainingDataError) {
      console.error('❌ Error deleting training data:', trainingDataError)
      // Don't fail, continue
    } else {
      console.log('✅ Deleted training data')
    }

    // Delete agent resources
    const { error: resourcesError } = await supabase
      .from('agent_resources')
      .delete()
      .eq('agent_id', agentId)

    if (resourcesError) {
      console.error('❌ Error deleting agent resources:', resourcesError)
      // Don't fail, continue
    } else {
      console.log('✅ Deleted agent resources')
    }

    // Finally, delete the agent itself
    console.log('🎯 Deleting agent record...')
    const { error: deleteError } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId)
      .eq('creator_id', user.id) // Double-check ownership

    if (deleteError) {
      console.error('❌ Database error deleting agent:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete agent: ${deleteError.message}` },
        { status: 500 }
      )
    }
    
    console.log('✅ Agent deleted successfully')

    return NextResponse.json(
      { message: 'Agent deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agentId = parseInt(id)
    
    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = await createClient()

    // Get current session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    
    // First, check if the agent exists and belongs to the user
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('creator_id', user.id)
      .single()

    if (fetchError || !existingAgent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      )
    }

    // Update the agent
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        name: body.name,
        description: body.description,
        universe: body.universe,
        topic_expertise: body.topicExpertise,
        system_prompt: body.systemPrompt,
        model_provider: body.modelProvider,
        model_version: body.modelVersion,
        visibility: body.visibility,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .eq('creator_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database error updating agent:', updateError)
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({ agent: updatedAgent }, { status: 200 })
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 