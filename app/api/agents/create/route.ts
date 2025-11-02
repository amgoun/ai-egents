import { createClient } from '@/lib/supabase/server'
import { uploadAgentAvatar } from '@/lib/supabase/storage'
import { NextResponse } from 'next/server'
import { uploadAgentResource } from '@/lib/agent-resources'
import { z } from 'zod'

// API input validation schema
const createAgentSchema = z.object({
  name: z.string().min(2),
  modelProvider: z.enum(["OpenAI", "Anthropic"]),
  modelVersion: z.enum(["gpt-4o-mini", "gpt-4o", "claude-3.5-sonnet", "claude-3.7-sonnet"], {
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
    const resourceFiles: File[] = []
    const rejectedFiles: Array<{ name: string; reason: string }> = []

    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData request
      const formData = await request.formData()
      const jsonData = formData.get('data')
      avatarImage = formData.get('avatarImage') as File | null
      const files = formData.getAll('resourceFiles')
      files.forEach((f) => {
        if (f instanceof File) {
          const isPdf = f.type === 'application/pdf'
          const isText = f.type.startsWith('text/')
          if (isPdf || isText) {
            resourceFiles.push(f)
          } else {
            rejectedFiles.push({ name: f.name, reason: 'Unsupported file type. Only PDF and text files are allowed.' })
          }
        }
      })
      
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
      model_version: "gpt-4o-mini" | "gpt-4o" | "claude-3.5-sonnet" | "claude-3.7-sonnet";
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

    // Upload and ingest resource files (if provided)
    if (resourceFiles.length > 0 || rejectedFiles.length > 0) {
      const results = [] as Array<{ name: string; success: boolean; error?: string }>

      for (const file of resourceFiles) {
        const res = await uploadAgentResource(file, agent.id, user.id)
        results.push({ name: file.name, ...res })
      }

      // Include rejected files as failed results for clarity
      for (const rej of rejectedFiles) {
        results.push({ name: rej.name, success: false, error: rej.reason })
      }

      return NextResponse.json({ agent, resourceIngestion: results })
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