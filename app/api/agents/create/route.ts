import { createClient } from '@/lib/supabase/server'
import { uploadAgentAvatar } from '@/lib/supabase/storage'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// API input validation schema
const createAgentSchema = z.object({
  name: z.string().min(2),
  modelProvider: z.enum(["OpenAI", "Anthropic"]),
  modelVersion: z.enum(["gpt-4", "gpt-4.1", "claude-3.5-sonnet", "claude-3.7-sonnet"], {
    required_error: "Please select a model version.",
  }),
  visibility: z.enum(["public", "private"]),
  universe: z.string().min(10),
  topicExpertise: z.string().min(2),
  systemPrompt: z.string().min(10).default("You are a helpful AI assistant."),
  useAiAvatar: z.boolean().default(true),
  avatarUrl: z.string().optional(),
  avatarPath: z.string().optional(),
  imageDescription: z.string().optional(),
  files: z.array(z.object({
    name: z.string(),
    size: z.number(),
    type: z.string()
  })).optional()
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

    let validatedData: z.infer<typeof createAgentSchema>
    let avatarImage: File | null = null

    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData request
      const formData = await request.formData()
      const jsonData = formData.get('data')
      avatarImage = formData.get('avatarImage') as File | null
      
      if (!jsonData || typeof jsonData !== 'string') {
        throw new Error('Invalid form data')
      }
      
      validatedData = createAgentSchema.parse(JSON.parse(jsonData))
    } else {
      // Handle JSON request
      const body = await request.json()
      validatedData = createAgentSchema.parse(body)
    }

    // Create base insert data
    const insertData: {
      name: string;
      model_provider: "OpenAI" | "Anthropic";
      model_version: "gpt-4" | "gpt-4.1" | "claude-3.5-sonnet" | "claude-3.7-sonnet";
      visibility: "public" | "private";
      universe: string;
      topic_expertise: string;
      system_prompt: string;
      creator_id: string;
      avatar_url?: string;
      avatar_path?: string;
    } = {
      name: validatedData.name,
      model_provider: validatedData.modelProvider,
      model_version: validatedData.modelVersion,
      visibility: validatedData.visibility,
      universe: validatedData.universe,
      topic_expertise: validatedData.topicExpertise,
      system_prompt: validatedData.systemPrompt,
      creator_id: user.id
    }

    // Handle avatar data
    if (validatedData.useAiAvatar) {
      // Use the AI-generated avatar data
      if (validatedData.avatarUrl && validatedData.avatarPath) {
        console.log('Using AI-generated avatar:', {
          url: validatedData.avatarUrl,
          path: validatedData.avatarPath,
          urlLength: validatedData.avatarUrl.length,
          urlValid: validatedData.avatarUrl.startsWith('http')
        })
        insertData.avatar_url = validatedData.avatarUrl
        insertData.avatar_path = validatedData.avatarPath
      } else {
        console.log('AI avatar requested but no URL/path provided:', {
          useAiAvatar: validatedData.useAiAvatar,
          avatarUrl: validatedData.avatarUrl,
          avatarPath: validatedData.avatarPath
        })
      }
    } else if (avatarImage) {
      // Handle uploaded avatar
      try {
        console.log('Uploading avatar image:', {
          fileName: avatarImage.name,
          fileSize: avatarImage.size,
          fileType: avatarImage.type
        })
        const { path, url } = await uploadAgentAvatar(user.id, avatarImage)
        console.log('Uploaded avatar:', { 
          path, 
          url,
          urlLength: url.length,
          urlValid: url.startsWith('http')
        })
        insertData.avatar_url = url
        insertData.avatar_path = path
      } catch (uploadError) {
        console.error('Avatar upload failed:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload avatar' },
          { status: 500 }
        )
      }
    } else {
      console.log('No avatar provided - neither AI generated nor uploaded')
    }

    // Create agent in database
    console.log('Creating agent with data:', insertData)
    const { data: agent, error: dbError } = await supabase
      .from('agents')
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      )
    }

    console.log('Agent created successfully:', agent)

    // Handle file uploads if any
    if (validatedData.files && validatedData.files.length > 0) {
      const { data: resources, error: resourceError } = await supabase
        .from('agent_resources')
        .insert(
          validatedData.files.map(file => ({
            agent_id: agent.id,
            name: file.name,
            size: file.size,
            type: file.type,
            user_id: user.id
          }))
        )
        .select()

      if (resourceError) {
        console.error('Resource error:', resourceError)
        return NextResponse.json({
          agent,
          resourceError: 'Failed to create some resources'
        })
      }

      return NextResponse.json({ agent, resources })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 