import { createClient } from '@supabase/supabase-js'
import { processDocument } from './db/vector'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SERVICE_ROLE_KEY!

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey)

export async function uploadAgentResource(
  file: File,
  agentId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('agent-resources')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // 2. Get the file content
    let content = ''
    if (file.type === 'application/pdf') {
      // Handle PDF using pdf-parse or similar library
      content = await extractPdfContent(file)
    } else if (file.type === 'text/plain' || file.type.includes('text')) {
      content = await file.text()
    } else {
      throw new Error('Unsupported file type')
    }

    // 3. Process the document and create embeddings
    await processDocument(
      agentId,
      fileName,
      content,
      file.type
    )

    return { success: true }
  } catch (error) {
    console.error('Error uploading resource:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

// Helper function to extract content from PDF
async function extractPdfContent(file: File): Promise<string> {
  // TODO: Implement PDF content extraction
  // You can use libraries like pdf-parse or pdfjs-dist
  return ''
} 