import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createClient } from '@supabase/supabase-js'
import type { Document } from '@langchain/core/documents'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials')
}

// Initialize OpenAI embeddings with LangChain
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-large', // Using the latest model
  stripNewLines: true, // Recommended for better embedding quality
})

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

interface DocumentChunk extends Document {
  pageContent: string;
  metadata: Record<string, any>;
}

export async function processDocument(
  agentId: number,
  fileName: string,
  content: string,
  fileType: string
) {
  try {
    // Split the document into chunks using LangChain's splitter
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })
    
    const docs = await splitter.createDocuments([content])
    
    // Get text chunks
    const chunks = docs.map((doc: DocumentChunk) => doc.pageContent)
    
    // Generate embeddings using LangChain's OpenAI integration
    const vectorEmbeddings = await embeddings.embedDocuments(chunks)
    
    // Store in database
    const { data, error } = await supabase.from('agent_training_data').insert({
      agent_id: agentId,
      content: content,
      chunks: chunks,
      embedding: vectorEmbeddings[0], // Store the first embedding as the main document embedding
      metadata: {
        file_name: fileName,
        file_type: fileType,
        chunk_count: chunks.length,
        chunk_embeddings: vectorEmbeddings.slice(1), // Store rest of chunk embeddings in metadata
      }
    }).select()

    if (error) {
      console.error('Error storing document:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error processing document:', error)
    throw error
  }
}

export async function searchSimilarContent(
  query: string,
  agentId: number,
  matchThreshold = 0.7,
  matchCount = 5
) {
  try {
    // Generate embedding for the query using LangChain
    const queryEmbedding = await embeddings.embedQuery(query)

    // Search for similar content using our custom function
    const { data: similarContent, error } = await supabase.rpc(
      'match_agent_content',
      {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        agent_id: agentId
      }
    )

    if (error) {
      console.error('Error searching content:', error)
      throw error
    }

    return similarContent
  } catch (error) {
    console.error('Error searching similar content:', error)
    throw error
  }
}

// Function to combine similar content into context
export function combineContext(similarContent: any[]) {
  if (!similarContent?.length) return ''
  
  return similarContent
    .map(content => content.chunk)
    .join('\n\n---\n\n')
}

// Helper function to validate embeddings
export async function validateEmbedding(text: string): Promise<boolean> {
  try {
    const embedding = await embeddings.embedQuery(text)
    return embedding.length === 1536 // Validate dimension
  } catch (error) {
    console.error('Error validating embedding:', error)
    return false
  }
} 