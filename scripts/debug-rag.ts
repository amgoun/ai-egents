/**
 * Debug script to check RAG pipeline setup
 * Run: npx tsx scripts/debug-rag.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load both .env and .env.local (Next.js convention)
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

console.log('📋 Checking environment files...')
const envExists = fs.existsSync(path.join(process.cwd(), '.env'))
const envLocalExists = fs.existsSync(path.join(process.cwd(), '.env.local'))
console.log(`   .env file: ${envExists ? '✅ Found' : '❌ Not found'}`)
console.log(`   .env.local file: ${envLocalExists ? '✅ Found' : '❌ Not found'}`)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SERVICE_ROLE_KEY

console.log('\n🔑 Environment Variables Status:')
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set (' + supabaseUrl.substring(0, 30) + '...)' : '❌ Missing'}`)
console.log(`   SERVICE_ROLE_KEY: ${supabaseKey ? '✅ Set (' + supabaseKey.substring(0, 20) + '...)' : '❌ Missing'}`)

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing required Supabase credentials')
  console.error('   Make sure both NEXT_PUBLIC_SUPABASE_URL and SERVICE_ROLE_KEY are set')
  console.error('   in either .env or .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugRAG() {
  console.log('🔍 RAG Pipeline Debug Check\n')
  console.log('='.repeat(50))

  // 1. Check if tables exist
  console.log('\n1️⃣ Checking tables...')
  
  try {
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, creator_id')
      .limit(5)
    
    if (agentsError) {
      console.error('❌ agents table:', agentsError.message)
    } else {
      console.log(`✅ agents table exists (${agents.length} agents found)`)
      agents.forEach(a => console.log(`   - Agent #${a.id}: ${a.name}`))
    }
  } catch (e) {
    console.error('❌ agents table error:', e)
  }

  try {
    const { data: training, error: trainingError } = await supabase
      .from('agent_training_data')
      .select('id, agent_id, metadata')
      .limit(5)
    
    if (trainingError) {
      console.error('❌ agent_training_data table:', trainingError.message)
    } else {
      console.log(`✅ agent_training_data table exists (${training.length} documents found)`)
      training.forEach(t => console.log(`   - Doc #${t.id} for Agent #${t.agent_id}: ${(t.metadata as any)?.file_name}`))
    }
  } catch (e) {
    console.error('❌ agent_training_data table error:', e)
  }

  // 2. Check vector extension
  console.log('\n2️⃣ Checking pgvector extension...')
  try {
    const { data, error } = await supabase.rpc('match_agent_content', {
      query_embedding: Array(1536).fill(0),
      match_threshold: 0.5,
      match_count: 1,
      agent_id: 1
    })
    
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.error('❌ match_agent_content function missing - run the SQL migration!')
    } else if (error && error.message.includes('vector')) {
      console.error('❌ pgvector extension not installed')
    } else {
      console.log('✅ pgvector extension and match_agent_content function working')
    }
  } catch (e: any) {
    console.error('❌ Vector search error:', e.message)
  }

  // 3. Check environment variables
  console.log('\n3️⃣ Checking environment variables...')
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
  console.log(`   SERVICE_ROLE_KEY: ${process.env.SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`)

  // 4. Check storage bucket
  console.log('\n4️⃣ Checking storage bucket...')
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (error) {
      console.error('❌ Storage error:', error.message)
    } else {
      const agentResourcesBucket = buckets.find(b => b.name === 'agent-resources')
      if (agentResourcesBucket) {
        console.log('✅ agent-resources bucket exists')
      } else {
        console.error('❌ agent-resources bucket missing')
        console.log('   Create it in Supabase Dashboard → Storage')
      }
    }
  } catch (e: any) {
    console.error('❌ Storage check error:', e.message)
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n📋 Next Steps:')
  console.log('   1. If tables missing: Run SQL migration in Supabase SQL Editor')
  console.log('   2. If function missing: Run supabase/migrations/20240000000001_init_vector.sql')
  console.log('   3. If bucket missing: Create "agent-resources" bucket in Supabase')
  console.log('   4. Re-upload your PDF to the agent')
  console.log('   5. Check server console for upload logs (📤, ✂️, 🧠, 💾)')
  console.log('   6. Try asking your question again\n')
}

debugRAG().catch(console.error)

