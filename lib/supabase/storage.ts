import { createClient } from './server'
import { SupabaseClient } from '@supabase/supabase-js'

const AVATAR_BUCKET = 'agent-avatar'

export async function uploadAgentAvatar(userId: string, file: Blob, oldAvatarPath?: string) {
  const supabaseClient = await createClient()

  try {
    // Delete old avatar if it exists
    if (oldAvatarPath) {
      console.log('🗑️ Deleting old avatar:', oldAvatarPath)
      try {
        const { error: deleteError } = await supabaseClient
          .storage
          .from(AVATAR_BUCKET)
          .remove([oldAvatarPath])

        if (deleteError) {
          console.error('❌ Error deleting old avatar:', deleteError)
        } else {
          console.log('✅ Old avatar deleted successfully')
        }
      } catch (deleteError) {
        console.error('❌ Failed to delete old avatar:', deleteError)
        // Continue with upload even if delete fails
      }
    } else {
      console.log('ℹ️ No old avatar to delete (first upload for this agent)')
    }

    // Generate a unique filename
    const timestamp = Date.now()
    const filename = `${userId}/${timestamp}.png`

    console.log('Uploading file:', {
      bucket: AVATAR_BUCKET,
      filename,
      fileSize: file.size
    })

    // Upload new avatar
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from(AVATAR_BUCKET)
      .upload(filename, file, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    console.log('Upload successful:', uploadData)

    // Get the public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(uploadData.path)

    console.log('Generated public URL:', publicUrl)
    
    // Detailed URL analysis
    try {
      const url = new URL(publicUrl)
      console.log('🔍 Generated URL Analysis:', {
        fullUrl: publicUrl,
        hostname: url.hostname,
        pathname: url.pathname,
        expectedPattern: '/storage/v1/object/public/agent-avatar/',
        actualPattern: url.pathname.substring(0, 35),
        patternMatch: url.pathname.startsWith('/storage/v1/object/public/agent-avatar/'),
        pathSegments: url.pathname.split('/'),
        expectedHostname: 'neeyzyrrxexfghagdgra.supabase.co',
        hostnameMatch: url.hostname === 'neeyzyrrxexfghagdgra.supabase.co'
      })
    } catch (urlError) {
      console.error('URL analysis error:', urlError)
    }

    // Verify URL format
    if (!publicUrl || !publicUrl.startsWith('http')) {
      console.error('Invalid public URL:', publicUrl)
      throw new Error('Failed to generate valid public URL')
    }

    // Test the URL immediately after generation
    try {
      console.log('🧪 Testing generated URL...')
      const testResponse = await fetch(publicUrl)
      console.log('📡 URL test result:', {
        url: publicUrl,
        status: testResponse.status,
        ok: testResponse.ok,
        contentType: testResponse.headers.get('content-type'),
        statusText: testResponse.statusText
      })
    } catch (testError) {
      console.error('📡 URL test failed:', testError)
    }

    return {
      path: uploadData.path,
      url: publicUrl
    }
  } catch (error) {
    console.error('Storage operation failed:', error)
    throw error
  }
}

export async function deleteAgentAvatar(path: string) {
  const supabaseClient = await createClient()

  try {
    const { error } = await supabaseClient
      .storage
      .from(AVATAR_BUCKET)
      .remove([path])

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to delete avatar:', error)
    throw error
  }
}

export async function getAvatarPublicUrl(path: string) {
  const supabaseClient = await createClient()
  const { data: { publicUrl } } = supabaseClient
    .storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path)
  
  return publicUrl
} 