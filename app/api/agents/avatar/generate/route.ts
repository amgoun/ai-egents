import { createClient } from '@/lib/supabase/server'
import { uploadAgentAvatar } from '@/lib/supabase/storage'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { AVATAR_GENERATION_COST, getAvatarLimitForPlan } from '@/lib/utils/token-counter'

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
    
    // Fetch user's usage limits
    console.log('💰 Checking token balance and avatar limits...')
    const { data: usageLimit, error: usageError } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_end', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching usage limits:', usageError)
    }
    
    // Check avatar generation limits (unless regenerating)
    if (!oldAvatarPath && usageLimit) {
      const avatarsGenerated = usageLimit.avatars_generated || 0
      const avatarsLimit = usageLimit.avatars_limit || getAvatarLimitForPlan(usageLimit.plan_type)
      
      console.log(`User has generated ${avatarsGenerated}/${avatarsLimit} avatars this period`)
      
      if (avatarsGenerated >= avatarsLimit) {
        console.log('❌ Avatar generation limit reached')
        return NextResponse.json(
          { 
            error: 'Avatar limit reached',
            message: `You've reached your limit of ${avatarsLimit} AI-generated avatars this month. ${usageLimit.plan_type === 'free' ? 'Upgrade to Pro for 50 avatars per month!' : 'Your limit will reset next month.'}`,
            avatarsGenerated,
            avatarsLimit,
            upgradeUrl: '/pricing'
          },
          { status: 403 }  // Forbidden
        )
      }
    } else if (oldAvatarPath) {
      console.log('✅ Regenerating avatar (replacing existing):', oldAvatarPath)
      // Regeneration doesn't count against limit
    }
    
    // Check token balance
    if (usageLimit) {
      const remainingTokens = usageLimit.tokens_limit - usageLimit.tokens_used
      console.log(`User has ${remainingTokens.toLocaleString()} tokens remaining`)
      
      if (remainingTokens < AVATAR_GENERATION_COST) {
        console.log('❌ Insufficient tokens for avatar generation')
        return NextResponse.json(
          { 
            error: 'Insufficient tokens',
            message: `Avatar generation requires ${AVATAR_GENERATION_COST.toLocaleString()} tokens. You have ${remainingTokens.toLocaleString()} tokens remaining. Upgrade to Pro for 10M tokens!`,
            tokensRequired: AVATAR_GENERATION_COST,
            tokensRemaining: remainingTokens,
            upgradeUrl: '/pricing'
          },
          { status: 402 }  // Payment Required
        )
      }
    }

    // Generate image using DALL-E with optimized prompt for avatar
    console.log('🎨 Calling DALL-E API...')
    
    // Enhance prompt for better avatar generation
    const enhancedPrompt = `Create a single professional avatar portrait for an AI agent. ${prompt}. 
    Style: Clean, modern, professional headshot. 
    Composition: Centered face/character, square format, suitable for profile picture.
    Quality: High detail, vibrant colors, clear features.
    Background: Simple gradient or solid color that complements the character.
    Format: Portrait orientation, face clearly visible, professional appearance.`
    
    const dalleResponse = await openai.images.generate({
      model: "dall-e-2",  // DALL-E 2 supports 512x512
      prompt: enhancedPrompt,
      n: 1,
      size: "512x512",  // Smaller, cheaper, faster
      // quality and style only work with dall-e-3
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

    // Deduct tokens and increment avatar count after successful generation
    if (usageLimit) {
      console.log(`💸 Deducting ${AVATAR_GENERATION_COST} tokens and incrementing avatar count...`)
      
      // Only increment avatar count for NEW generations (not regenerations)
      const updateData: any = { 
        tokens_used: usageLimit.tokens_used + AVATAR_GENERATION_COST
      }
      
      if (!oldAvatarPath) {
        updateData.avatars_generated = (usageLimit.avatars_generated || 0) + 1
        console.log(`Incrementing avatar count: ${usageLimit.avatars_generated || 0} -> ${updateData.avatars_generated}`)
      }
      
      await Promise.all([
        // Update usage limits
        supabase
          .from('usage_limits')
          .update(updateData)
          .eq('id', usageLimit.id),
        
        // Log token usage
        supabase
          .from('token_usage')
          .insert({
            user_id: user.id,
            tokens_used: AVATAR_GENERATION_COST,
            model_used: 'dall-e-2',
            operation_type: 'avatar_generation'
          })
      ])
      
      const newRemainingTokens = usageLimit.tokens_limit - (usageLimit.tokens_used + AVATAR_GENERATION_COST)
      console.log(`✅ Tokens deducted. Remaining: ${newRemainingTokens.toLocaleString()}`)
    }

    const responseData = {
      imageUrl: url,
      imagePath: path,
      tokensUsed: AVATAR_GENERATION_COST,
      remainingTokens: usageLimit ? usageLimit.tokens_limit - (usageLimit.tokens_used + AVATAR_GENERATION_COST) : undefined,
      avatarsGenerated: usageLimit && !oldAvatarPath ? (usageLimit.avatars_generated || 0) + 1 : undefined,
      avatarsLimit: usageLimit ? usageLimit.avatars_limit : undefined
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