import { createClient } from './server'
import { SupabaseClient } from '@supabase/supabase-js'

const AVATAR_BUCKET = 'agent-avatar'

export async function uploadAgentAvatar(userId: string, file: Blob, oldAvatarPath?: string) {
  const supabaseClient = await createClient()

  try {
    // Delete old avatar if it exists
    if (oldAvatarPath) {
      try {
        const { error: deleteError } = await supabaseClient
          .storage
          .from(AVATAR_BUCKET)
          .remove([oldAvatarPath])

        if (deleteError) {
          console.error('Error deleting old avatar:', deleteError)
        }
      } catch (deleteError) {
        console.error('Failed to delete old avatar:', deleteError)
        // Continue with upload even if delete fails
      }
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

    // Verify URL format
    if (!publicUrl || !publicUrl.startsWith('http')) {
      console.error('Invalid public URL:', publicUrl)
      throw new Error('Failed to generate valid public URL')
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