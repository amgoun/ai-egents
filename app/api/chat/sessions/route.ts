import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  console.log('Chat sessions API called')
  try {
    const supabase = await createClient()
    console.log('Supabase client created')
    
    const { data: { user }, error } = await supabase.auth.getUser()
    console.log('User check:', { userId: user?.id, error })
    
    if (error || !user) {
      console.log('No user authenticated, returning empty chats')
      return NextResponse.json({ chats: [] })
    }

    console.log('Fetching chat sessions for user:', user.id)
    // Fetch chat sessions with agent details
    const { data: chatData, error: chatError } = await supabase
      .from('chat_sessions')
      .select('*, agent:agents(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log('Database query result:', { data: chatData?.length, error: chatError })

    if (chatError) {
      console.error('Database error fetching chats:', chatError)
      return NextResponse.json({ chats: [] })
    }

    if (!chatData) {
      console.log('No data returned from database')
      return NextResponse.json({ chats: [] })
    }

    // Format and type the response
    const chats = chatData
      .filter(chat => chat.agent) // Filter out chats with missing agents
      .map(chat => ({
        id: chat.id,
        title: chat.title || 'New Chat',
        agentId: chat.agent_id,
        createdAt: chat.created_at,
        agent: {
          id: chat.agent.id,
          name: chat.agent.name || 'AI Agent',
          description: chat.agent.description || '',
          avatarUrl: chat.agent.avatar_url || null,
          modelProvider: chat.agent.model_provider || 'OpenAI',
          modelVersion: chat.agent.model_version || 'gpt-4o-mini'
        }
      }))

    console.log('Formatted chats:', chats.length)
    return NextResponse.json({ chats })
  } catch (error) {
    console.error('Error in chat sessions API:', error)
    return NextResponse.json({ chats: [] }, { status: 500 })
  }
} 