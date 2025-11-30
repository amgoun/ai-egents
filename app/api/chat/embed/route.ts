import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { estimateTokens } from '@/lib/utils/token-counter'
import OpenAI from 'openai'
import { searchSimilarContent, combineContext } from '@/lib/db/vector'

const embedMessageSchema = z.object({
  message: z.string().min(1),
  agentId: z.number(),
  visitorId: z.string().min(1),
  sessionId: z.number().optional()
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validatedData = embedMessageSchema.parse(body)

    // 1. Verify Agent exists
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', validatedData.agentId)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // 2. Get or Create Session for this Visitor
    let sessionId = validatedData.sessionId
    
    if (!sessionId) {
        // Check if there's an active recent session for this visitor
        const { data: existingSession } = await supabase
            .from('chat_sessions')
            .select('id')
            .eq('visitor_id', validatedData.visitorId)
            .eq('agent_id', agent.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
            
        if (existingSession) {
            sessionId = existingSession.id
        } else {
            // Create new session
            const { data: newSession, error: sessionError } = await supabase
                .from('chat_sessions')
                .insert({
                    agent_id: agent.id,
                    visitor_id: validatedData.visitorId,
                    title: 'Guest Chat'
                    // user_id is left NULL
                })
                .select()
                .single()
                
            if (sessionError) throw sessionError
            sessionId = newSession.id
        }
    }

    // 3. Save User Message
    const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
            session_id: sessionId,
            content: validatedData.message,
            role: 'user'
        })
    
    if (userMsgError) throw userMsgError

    // 4. Generate AI Response
    const agentConfig = {
      id: agent.id as number,
      name: agent.name as string,
      topicExpertise: (agent as any).topic_expertise as string | undefined,
      modelProvider: (agent as any).model_provider as string | undefined,
      modelVersion: (agent as any).model_version as string | undefined,
      systemPrompt: (agent as any).system_prompt as string | undefined,
      temperature: (agent as any).temperature as number | undefined,
    }

    const expertiseLabel = agentConfig.topicExpertise || "general knowledge"
    let aiResponse = ''

    try {
      const similar = await searchSimilarContent(validatedData.message, agentConfig.id)
      const ragContext = combineContext(similar)

      if (agentConfig.modelProvider === 'OpenAI' && process.env.OPENAI_API_KEY) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const system = [
          `You are ${agentConfig.name}, an expert in ${expertiseLabel}.`,
          agentConfig.systemPrompt || '',
          'Use the provided CONTEXT when relevant. If the context is not relevant, answer normally. Be concise and helpful.'
        ].filter(Boolean).join('\n\n')

        const messagesForModel: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: 'system', content: system },
          { role: 'system', content: ragContext ? `CONTEXT:\n${ragContext}` : 'CONTEXT: (none relevant)' },
          { role: 'user', content: validatedData.message }
        ]

        const model = agentConfig.modelVersion || 'gpt-4o-mini'
        const completion = await openai.chat.completions.create({
          model,
          messages: messagesForModel,
          temperature: typeof agentConfig.temperature === 'number' ? Math.min(Math.max(agentConfig.temperature / 100, 0), 2) : 0.7
        })
        aiResponse = completion.choices[0]?.message?.content?.trim() || ''
      }

      if (!aiResponse) {
        aiResponse = "I apologize, but I am currently unable to generate a response. Please try again later."
      }
    } catch (ragError) {
      console.error('RAG/Generation error:', ragError)
      aiResponse = "I encountered an error processing your request."
    }

    // 5. Save AI Response
    const { data: aiMessage, error: aiMsgError } = await supabase
        .from('chat_messages')
        .insert({
            session_id: sessionId,
            content: aiResponse,
            role: 'assistant'
        })
        .select()
        .single()

    if (aiMsgError) throw aiMsgError

    return NextResponse.json({
        sessionId,
        messages: [{ role: 'assistant', content: aiResponse }]
    })

  } catch (error) {
    console.error('Embed chat error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

