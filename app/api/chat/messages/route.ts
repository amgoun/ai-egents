import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ChatMessage } from '@/lib/db/schema'
import { estimateTokens, createNewUsagePeriod, hasExceededTokenLimit } from '@/lib/utils/token-counter'
import OpenAI from 'openai'
import { searchSimilarContent, combineContext } from '@/lib/db/vector'

const messageQuerySchema = z.object({
  sessionId: z.number()
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
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
  agentId: z.number(),
  sessionId: z.number().optional()
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = sendMessageSchema.parse(body)

    // Get agent details for token estimation
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

    // Check token limits BEFORE processing
    let usageLimit = null
    const { data: existingUsage } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_end', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!existingUsage) {
      // No current usage period found, create one
      const newPeriod = createNewUsagePeriod('free')
      const { data: newUsage, error: createError } = await supabase
        .from('usage_limits')
        .insert({
          user_id: user.id,
          message_count: 0,
          agent_count: 0,
          tokens_used: 0,
          tokens_limit: newPeriod.tokensLimit,
          plan_type: newPeriod.planType,
          period_start: newPeriod.periodStart.toISOString(),
          period_end: newPeriod.periodEnd.toISOString()
        })
        .select()
        .single()

      if (createError || !newUsage) {
        console.error('Error creating usage limits:', createError)
        return NextResponse.json(
          { error: 'Failed to initialize usage tracking' },
          { status: 500 }
        )
      }
      usageLimit = newUsage
    } else {
      usageLimit = existingUsage
    }

    // Normalize DB fields to camelCase for internal use
    const agentConfig = {
      id: agent.id as number,
      name: agent.name as string,
      topicExpertise: (agent as any).topic_expertise as string | undefined,
      universe: (agent as any).universe as string | undefined,
      modelProvider: (agent as any).model_provider as string | undefined,
      modelVersion: (agent as any).model_version as string | undefined,
      systemPrompt: (agent as any).system_prompt as string | undefined,
      temperature: (agent as any).temperature as number | undefined,
    }

    const expertiseLabel = agentConfig.topicExpertise || agentConfig.universe || "your agent's expertise"

    // Estimate tokens for user message
    const estimatedInputTokens = estimateTokens(validatedData.message, agentConfig.modelVersion || 'gpt-4o-mini')
    
    // Check if user has exceeded token limit
    if (hasExceededTokenLimit(usageLimit.tokensUsed, usageLimit.tokensLimit)) {
      return NextResponse.json(
        { 
          error: 'Token limit exceeded', 
          message: `You have reached your monthly token limit of ${(usageLimit.tokensLimit / 1_000).toFixed(0)}K tokens. Upgrade to Pro for 10M tokens/month!`,
          tokensUsed: usageLimit.tokensUsed,
          tokensLimit: usageLimit.tokensLimit,
          planType: usageLimit.planType
        },
        { status: 429 }
      )
    }
    
    // Check if estimated token usage would exceed limit
    if (usageLimit.tokensUsed + estimatedInputTokens > usageLimit.tokensLimit) {
      return NextResponse.json(
        { 
          error: 'Message too large', 
          message: `This message would exceed your token limit. You have ${usageLimit.tokensLimit - usageLimit.tokensUsed} tokens remaining, but this message needs ~${estimatedInputTokens} tokens.`,
          tokensUsed: usageLimit.tokensUsed,
          tokensLimit: usageLimit.tokensLimit,
          estimatedTokens: estimatedInputTokens,
          planType: usageLimit.planType
        },
        { status: 429 }
      )
    }

    // Get or create chat session
    let sessionId: number

    if (validatedData.sessionId) {
      // Verify session belongs to user and agent
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', validatedData.sessionId)
        .eq('user_id', user.id)
        .eq('agent_id', validatedData.agentId)
        .single()

      if (existingSession) {
        sessionId = existingSession.id
      } else {
        // Invalid session ID provided, fall back to creating new
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
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
    } else {
      // No session ID provided, create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
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

    // Generate AI response using agent resources (RAG) when possible
    let aiResponse = ''
    let generatedTitle = ''
    
    try {
      // Retrieve relevant context from user/agent resources
      const similar = await searchSimilarContent(validatedData.message, agentConfig.id)
      const ragContext = combineContext(similar)

      // If OpenAI is configured and the agent uses it, generate with context
      if (agentConfig.modelProvider === 'OpenAI' && process.env.OPENAI_API_KEY) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const system = [
          `You are ${agentConfig.name}, an expert in ${agentConfig.topicExpertise || expertiseLabel}.`,
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

        // Generate a title for the chat if it's a new session or has a default title
        // We check if the session title starts with "Chat with Agent" which is our default
        const { data: currentSession } = await supabase
          .from('chat_sessions')
          .select('title')
          .eq('id', sessionId)
          .single()

        if (currentSession?.title?.startsWith('Chat with Agent')) {
          try {
            const titleCompletion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Generate a very short, concise title (3-5 words max) for this conversation based on the user message. Do not use quotes. Be specific to the topic.' },
                { role: 'user', content: validatedData.message }
              ],
              temperature: 0.7,
              max_tokens: 15
            })
            generatedTitle = titleCompletion.choices[0]?.message?.content?.trim() || ''
            
            if (generatedTitle) {
              await supabase
                .from('chat_sessions')
                .update({ title: generatedTitle })
                .eq('id', sessionId)
            }
          } catch (titleError) {
            console.error('Error generating title:', titleError)
          }
        }
      }

      // Fallback responses if OpenAI not available
      if (!aiResponse) {
        const messageText = validatedData.message.toLowerCase().trim()
        if (messageText.match(/^(hi|hello|hey|greetings|howdy)/i)) {
          aiResponse = `Hi! I'm ${agentConfig.name}, your ${expertiseLabel} expert. How can I help you today?`
        } else if (messageText.match(/^(bye|goodbye|see you|farewell)/i)) {
          aiResponse = `Goodbye! Feel free to come back if you need any more help with ${expertiseLabel}!`
        } else if (messageText.match(/^(thanks|thank you|thx)/i)) {
          aiResponse = `You're welcome! Let me know if you need anything else related to ${expertiseLabel}.`
        } else {
          aiResponse = ragContext
            ? `Based on your resources, here's relevant info:\n\n${ragContext}\n\nNow, regarding your question: ${validatedData.message}`
            : `I'll help you with "${validatedData.message}" from a ${expertiseLabel} perspective. What specific aspects would you like me to address?`
        }
      }
    } catch (ragError) {
      console.error('RAG pipeline error:', ragError)
      // Safe fallback
      aiResponse = `I'll help you with "${validatedData.message}" from a ${expertiseLabel} perspective. What specific aspects would you like me to address?`
    }

    // Estimate tokens for AI response
    const estimatedOutputTokens = estimateTokens(aiResponse, agentConfig.modelVersion || 'gpt-4o-mini')
    const totalTokens = estimatedInputTokens + estimatedOutputTokens

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

    // Update usage limits and log token usage
    await Promise.all([
      // Update usage limits
      supabase
        .from('usage_limits')
        .update({ 
          tokens_used: usageLimit.tokensUsed + totalTokens,
          message_count: usageLimit.messageCount + 1 
        })
        .eq('id', usageLimit.id),
      
      // Log detailed token usage for user message
      supabase
        .from('token_usage')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          agent_id: agent.id,
          message_id: userMessage.id,
          tokens_used: estimatedInputTokens,
          model_used: agentConfig.modelVersion || 'gpt-4o-mini',
          operation_type: 'chat'
        }),

      // Log detailed token usage for AI response
      supabase
        .from('token_usage')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          agent_id: agent.id,
          message_id: aiMessage.id,
          tokens_used: estimatedOutputTokens,
          model_used: agentConfig.modelVersion || 'gpt-4o-mini',
          operation_type: 'chat'
        })
    ])

    return NextResponse.json({
      sessionId,
      messages: [userMessage, aiMessage],
      title: generatedTitle || undefined,
      tokensUsed: totalTokens,
      remainingTokens: usageLimit.tokensLimit - (usageLimit.tokensUsed + totalTokens),
      usagePercentage: ((usageLimit.tokensUsed + totalTokens) / usageLimit.tokensLimit) * 100
    })
  } catch (error) {
    console.error('Error in send message:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 