/**
 * Verify Supabase API keys format
 */

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

console.log('🔑 Verifying Supabase API Keys Format\n')
console.log('='.repeat(50))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SERVICE_ROLE_KEY

// Check URL
console.log('\n1️⃣ NEXT_PUBLIC_SUPABASE_URL:')
if (!url) {
  console.log('   ❌ Not set')
} else if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
  console.log(`   ⚠️  Suspicious format: ${url}`)
  console.log('   Expected: https://xxxxx.supabase.co')
} else {
  console.log(`   ✅ ${url}`)
}

// Check Anon Key
console.log('\n2️⃣ NEXT_PUBLIC_SUPABASE_ANON_KEY:')
if (!anonKey) {
  console.log('   ❌ Not set')
} else if (!anonKey.startsWith('eyJ')) {
  console.log(`   ❌ Invalid format (should start with "eyJ"): ${anonKey.substring(0, 20)}...`)
} else if (anonKey.length < 100) {
  console.log(`   ⚠️  Too short (${anonKey.length} chars, expected 200+)`)
} else {
  console.log(`   ✅ Valid format (${anonKey.length} chars)`)
  console.log(`   Starts: ${anonKey.substring(0, 30)}...`)
}

// Check Service Role Key
console.log('\n3️⃣ SERVICE_ROLE_KEY:')
if (!serviceKey) {
  console.log('   ❌ Not set')
} else if (!serviceKey.startsWith('eyJ')) {
  console.log(`   ❌ Invalid format (should start with "eyJ"): ${serviceKey.substring(0, 20)}...`)
  console.log('   ⚠️  This looks wrong! Check your .env.local file')
} else if (serviceKey.length < 100) {
  console.log(`   ⚠️  Too short (${serviceKey.length} chars, expected 200+)`)
} else {
  console.log(`   ✅ Valid format (${serviceKey.length} chars)`)
  console.log(`   Starts: ${serviceKey.substring(0, 30)}...`)
}

console.log('\n' + '='.repeat(50))
console.log('\n📋 How to Get the Correct Keys:')
console.log('   1. Go to: https://supabase.com/dashboard')
console.log('   2. Select your project')
console.log('   3. Go to: Settings → API')
console.log('   4. Copy EXACTLY:')
console.log('      - Project URL → NEXT_PUBLIC_SUPABASE_URL')
console.log('      - anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY')
console.log('      - service_role → SERVICE_ROLE_KEY')
console.log('   5. Make sure there are NO extra spaces or quotes')
console.log('   6. Format in .env.local:')
console.log('      SERVICE_ROLE_KEY=eyJhbGciOi...')
console.log('      (No quotes, no spaces after =)')
console.log('')

