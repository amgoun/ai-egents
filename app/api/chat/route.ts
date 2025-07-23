import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// API input validation schema
const chatMessageSchema = z.object({
  message: z.string().min(1),
  agentId: z.number()
})

export async function POST(request: Request) {
  try {
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = chatMessageSchema.parse(body)

    // Get agent details
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', validatedData.agentId)
      .single()

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Get or create chat session
    let sessionId: number
    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('agent_id', agent.id)
      .single()

    if (existingSession) {
      sessionId = existingSession.id
    } else {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          agent_id: agent.id,
          title: `Chat with ${agent.name}`
        })
        .select()
        .single()

      if (!newSession) {
        throw new Error('Failed to create chat session')
      }
      sessionId = newSession.id
    }

    // Generate AI response based on context
    let aiResponse = ''
    const messageText = validatedData.message.toLowerCase().trim()

    // Handle greetings
    if (messageText.match(/^(hi|hello|hey|greetings|howdy)/i)) {
      aiResponse = `Hi! I'm ${agent.name}, your ${agent.topic_expertise} expert. How can I help you today?`
    }
    // Handle goodbyes
    else if (messageText.match(/^(bye|goodbye|see you|farewell)/i)) {
      aiResponse = `Goodbye! Feel free to come back if you need any more help with ${agent.topic_expertise}!`
    }
    // Handle thank you
    else if (messageText.match(/^(thanks|thank you|thx)/i)) {
      aiResponse = `You're welcome! Let me know if you need anything else related to ${agent.topic_expertise}.`
    }
    // Default response using agent's expertise
    else {
      aiResponse = `I'll help you with "${validatedData.message}" from a ${agent.topic_expertise} perspective. What specific aspects would you like me to address?`
    }

    // Save user message
    const { data: userMessage, error: userError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        content: validatedData.message,
        role: 'user'
      })
      .select()
      .single()

    if (userError) {
      throw new Error('Failed to save user message')
    }

    // Save AI response
    const { data: aiMessage, error: aiError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        content: aiResponse,
        role: 'assistant'
      })
      .select()
      .single()

    if (aiError) {
      throw new Error('Failed to save AI response')
    }

    return NextResponse.json({
      sessionId,
      messages: [userMessage, aiMessage]
    })

  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 