import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ChatMessage } from '@/lib/db/schema'

const messageQuerySchema = z.object({
  sessionId: z.number()
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get session ID from query params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    const validatedData = messageQuerySchema.parse({ sessionId: Number(sessionId) })

    // Fetch messages for the session
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', validatedData.sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error in chat messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const sendMessageSchema = z.object({
  message: z.string().min(1),
  agentId: z.number()
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = sendMessageSchema.parse(body)

    // Get or create chat session
    let sessionId: number
    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('agent_id', validatedData.agentId)
      .single()

    if (existingSession) {
      sessionId = existingSession.id
    } else {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: session.user.id,
          agent_id: validatedData.agentId,
          title: `Chat with Agent ${validatedData.agentId}`
        })
        .select()
        .single()

      if (sessionError || !newSession) {
        throw new Error('Failed to create chat session')
      }
      sessionId = newSession.id
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

    if (userError || !userMessage) {
      throw new Error('Failed to save user message')
    }

    // Generate AI response (simplified for now)
    const aiResponse = `This is a response to: "${validatedData.message}"`

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

    if (aiError || !aiMessage) {
      throw new Error('Failed to save AI response')
    }

    return NextResponse.json({
      sessionId,
      messages: [userMessage, aiMessage]
    })
  } catch (error) {
    console.error('Error in send message:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 