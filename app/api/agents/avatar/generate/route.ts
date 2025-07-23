import { createClient } from '@/lib/supabase/server'
import { uploadAgentAvatar } from '@/lib/supabase/storage'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  oldAvatarPath: z.string().optional()
})

export async function POST(request: Request) {
  try {
    // Initialize Supabase client
    const supabase = await createClient()

    // Get current session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('Avatar generation failed: Unauthorized user')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    console.log('Received request body:', body)
    
    const { prompt, oldAvatarPath } = requestSchema.parse(body)
    console.log('Generating avatar with prompt:', prompt)
    if (oldAvatarPath) {
      console.log('Will replace old avatar at:', oldAvatarPath)
    }

    // Generate image using DALL-E
    console.log('Calling DALL-E API...')
    const dalleResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Professional avatar for an AI agent. ${prompt}. Centered, high quality, detailed, modern style.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    })

    console.log('DALL-E response:', dalleResponse)

    if (!dalleResponse.data?.[0]?.url) {
      console.error('No image URL in DALL-E response')
      throw new Error('No image generated')
    }

    const imageUrl = dalleResponse.data[0].url
    console.log('Generated image URL:', imageUrl)

    // Download the generated image
    console.log('Downloading generated image...')
    const imageResponse = await fetch(imageUrl)
    const imageBlob = await imageResponse.blob()
    console.log('Image downloaded, size:', imageBlob.size, 'bytes')

    // Upload to Supabase storage and get public URL
    console.log('Uploading to Supabase storage...')
    const { path, url } = await uploadAgentAvatar(user.id, imageBlob, oldAvatarPath)
    console.log('Upload successful:', { path, url })

    // Verify the URL is properly formatted
    if (!url.startsWith('http')) {
      console.error('Invalid URL format:', url)
      throw new Error('Invalid avatar URL format')
    }

    const responseData = {
      imageUrl: url,
      imagePath: path
    }
    console.log('Sending response:', responseData)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error in avatar generation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate avatar', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 