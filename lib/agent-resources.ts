import { createClient } from '@supabase/supabase-js'
import { processDocument } from './db/vector'
import pdf from 'pdf-parse/lib/pdf-parse'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_ROLE_KEY!

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey)

export async function uploadAgentResource(
  file: File,
  agentId: number,
  userId?: string  // For token tracking
): Promise<{ success: boolean; error?: string; tokensUsed?: number }> {
  try {
    console.log('📤 Starting file upload:', { fileName: file.name, agentId, fileType: file.type })
    
    // 1. Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('agent-resources')
      .upload(fileName, file)

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError)
      throw uploadError
    }
    console.log('✅ File uploaded to storage:', fileName)

    // 2. Get the file content
    let content = ''
    if (file.type === 'application/pdf') {
      console.log('📄 Extracting PDF content...')
      content = await extractPdfContent(file)
      console.log(`✅ PDF extracted: ${content.length} characters`)
    } else if (file.type === 'text/plain' || file.type.includes('text')) {
      content = await file.text()
      console.log(`✅ Text file read: ${content.length} characters`)
    } else {
      throw new Error('Unsupported file type')
    }

    if (!content || content.trim().length === 0) {
      throw new Error('No content extracted from file')
    }

    // 3. Process the document and create embeddings
    console.log('🔄 Processing document and creating embeddings...')
    const result = await processDocument(
      agentId,
      fileName,
      content,
      file.type,
      userId
    )
    console.log('✅ Document processed successfully:', result)

    // 4. Deduct tokens if userId provided
    if (userId && result.tokensUsed) {
      console.log(`💸 Deducting ${result.tokensUsed} tokens for document embedding...`)
      
      // Get current usage
      const { data: usageLimit } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', userId)
        .gte('period_end', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (usageLimit) {
        await Promise.all([
          // Update usage limits
          supabase
            .from('usage_limits')
            .update({ 
              tokens_used: usageLimit.tokens_used + result.tokensUsed
            })
            .eq('id', usageLimit.id),
          
          // Log token usage
          supabase
            .from('token_usage')
            .insert({
              user_id: userId,
              agent_id: agentId,
              tokens_used: result.tokensUsed,
              model_used: 'text-embedding-3-small',
              operation_type: 'document_embedding'
            })
        ])
        
        console.log(`✅ Tokens deducted. Remaining: ${(usageLimit.tokens_limit - (usageLimit.tokens_used + result.tokensUsed)).toLocaleString()}`)
      }
    }

    return { 
      success: true,
      tokensUsed: result.tokensUsed
    }
  } catch (error) {
    console.error('❌ Error uploading resource:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

// Helper function to extract content from PDF
async function extractPdfContent(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Parse PDF
    const data = await pdf(buffer)
    
    // Return extracted text
    return data.text
  } catch (error) {
    console.error('Error extracting PDF content:', error)
    throw new Error('Failed to extract PDF content')
  }
}

// (DOCX support removed per current requirements)