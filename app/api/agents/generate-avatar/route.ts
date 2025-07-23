import { createClient } from '@/lib/supabase/server'
import { uploadAgentAvatar } from '@/lib/supabase/storage'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const AVATAR_BUCKET = 'agent-avatar'

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required")
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
    const { prompt } = requestSchema.parse(body)

    // Generate image using DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Professional avatar for an AI agent. ${prompt}. Centered, high quality, detailed, modern style.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    })

    if (!response.data?.[0]?.url) {
      throw new Error('No image generated')
    }

    const imageUrl = response.data[0].url

    // Store the image URL in Supabase Storage
    const imageResponse = await fetch(imageUrl)
    const imageBlob = await imageResponse.blob()
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(AVATAR_BUCKET)
      .upload(
        `${user.id}/${Date.now()}.png`,
        imageBlob,
        {
          contentType: 'image/png',
          cacheControl: '3600'
        }
      )

    if (uploadError) {
      console.error('Storage error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to store avatar' },
        { status: 500 }
      )
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(uploadData.path)

    return NextResponse.json({ imageUrl: publicUrl })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error generating avatar:', error)
    return NextResponse.json(
      { error: 'Failed to generate avatar' },
      { status: 500 }
    )
  }
} 