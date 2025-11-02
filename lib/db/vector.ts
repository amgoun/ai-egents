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
  modelName: 'text-embedding-3-small', // 1536-dim to match DB schema
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
  fileType: string,
  userId?: string  // Optional for token tracking
) {
  try {
    console.log(`📚 Processing document for agent ${agentId}:`, { fileName, contentLength: content.length })
    
    // Split the document into chunks using LangChain's splitter
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })
    
    const docs = await splitter.createDocuments([content])
    console.log(`✂️ Split into ${docs.length} chunks`)
    
    // Get text chunks
    const chunks = docs.map((doc: DocumentChunk) => doc.pageContent)
    
    // Calculate token cost for embeddings
    // OpenAI text-embedding-3-small: ~$0.0001 per 1K tokens
    // Approximate: 1 chunk (~1000 chars) ≈ 250 tokens
    const estimatedTokensPerChunk = 250
    const totalEmbeddingTokens = chunks.length * estimatedTokensPerChunk
    console.log(`💰 Estimated embedding cost: ${totalEmbeddingTokens} tokens for ${chunks.length} chunks`)
    
    // Generate embeddings using LangChain's OpenAI integration
    console.log('🧠 Generating embeddings with OpenAI...')
    const vectorEmbeddings = await embeddings.embedDocuments(chunks)
    console.log(`✅ Generated ${vectorEmbeddings.length} embeddings`)
    
    // Store in database
    console.log('💾 Storing in database...')
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
      console.error('❌ Error storing document in database:', error)
      throw error
    }

    console.log('✅ Document stored successfully in database')
    
    // Return data with token cost
    return {
      data,
      tokensUsed: totalEmbeddingTokens,
      chunkCount: chunks.length
    }
  } catch (error: any) {
    console.error('❌ Error processing document:', error)
    
    // Provide helpful error messages
    if (error?.message?.includes('quota') || error?.message?.includes('429')) {
      throw new Error('OpenAI API quota exceeded. Please add credits at https://platform.openai.com/account/billing')
    }
    
    throw error
  }
}

export async function searchSimilarContent(
  query: string,
  agentId: number,
  matchThreshold = 0.5,  // Lowered from 0.7 for better recall
  matchCount = 5
) {
  try {
    console.log(`🔍 Searching similar content for agent ${agentId}:`, { query, matchThreshold, matchCount })
    
    // Generate embedding for the query using LangChain
    const queryEmbedding = await embeddings.embedQuery(query)
    console.log(`✅ Generated query embedding: ${queryEmbedding.length} dimensions`)

    // Search for similar content using our custom function
    const { data: similarContent, error } = await supabase.rpc(
      'match_agent_content',
      {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_agent_id: agentId  // Changed from agent_id to filter_agent_id
      }
    )

    if (error) {
      console.error('❌ Error searching content:', error)
      throw error
    }

    console.log(`✅ Found ${similarContent?.length || 0} matching chunks with similarity > ${matchThreshold}`)
    if (similarContent && similarContent.length > 0) {
      console.log('Top match similarity:', similarContent[0]?.similarity)
    }

    return similarContent
  } catch (error) {
    console.error('❌ Error searching similar content:', error)
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