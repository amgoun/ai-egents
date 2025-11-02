# Troubleshooting: Agent Not Using Uploaded PDF

## The Problem
Your agent "graphql master" is giving generic answers instead of using the uploaded GraphQL PDF book.

## Root Cause Analysis
Based on the debug output showing "Missing Supabase credentials", the issue is likely one of these:

### 1. ❌ Missing/Incorrect Environment Variables
Your `.env` file is missing or has incorrect Supabase credentials.

**Check your `.env` file has ALL of these:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres...
OPENAI_API_KEY=sk-...
```

**To get these values:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SERVICE_ROLE_KEY`
4. Go to **Settings** → **Database**
   - Copy URI connection string → `DATABASE_URL`
   - Replace `[YOUR-PASSWORD]` with your actual database password

### 2. ❌ Database Tables Don't Exist
The `agent_training_data` table (for storing embeddings) doesn't exist.

**Fix:** Run the SQL migration:
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Copy content from `supabase/migrations/00_complete_setup.sql`
3. Paste and click **Run**

### 3. ❌ Storage Bucket Missing
The `agent-resources` bucket doesn't exist.

**Fix:** Create the bucket:
1. Go to Supabase Dashboard → **Storage**
2. Click **New bucket**
3. Name: `agent-resources`
4. Set as **Public** (or configure RLS policies)
5. Click **Create**

## Step-by-Step Fix

### Step 1: Verify Environment Variables
Run this command to check:
```powershell
npx tsx scripts/debug-rag.ts
```

Expected output should show:
```
✅ NEXT_PUBLIC_SUPABASE_URL: ✅ Set
✅ SERVICE_ROLE_KEY: ✅ Set
✅ OPENAI_API_KEY: ✅ Set
✅ DATABASE_URL: ✅ Set
```

If you see ❌, update your `.env` file with correct values.

### Step 2: Run Database Migration
```powershell
# After fixing .env, try Drizzle migration
pnpm db:migrate
```

OR manually in Supabase SQL Editor:
- Copy `supabase/migrations/00_complete_setup.sql`
- Paste in SQL Editor
- Run

### Step 3: Create Storage Bucket
1. Supabase Dashboard → Storage
2. Create bucket: `agent-resources`
3. Make it public or add RLS policies

### Step 4: Restart App
```powershell
# Stop dev server (Ctrl+C)
pnpm dev
```

### Step 5: Re-Upload PDF
1. Go to your "graphql master" agent
2. Click **Edit Agent**
3. Upload the GraphQL PDF again
4. Watch the **server console** for these logs:
   ```
   📤 Starting file upload: { fileName: 'graphql-book.pdf', agentId: X }
   📄 Extracting PDF content...
   ✅ PDF extracted: 50000 characters
   🔄 Processing document and creating embeddings...
   📚 Processing document for agent X
   ✂️ Split into 45 chunks
   🧠 Generating embeddings with OpenAI...
   ✅ Generated 45 embeddings
   💾 Storing in database...
   ✅ Document stored successfully in database
   ```

If you see errors here, that's the root cause!

### Step 6: Test Chat
1. Ask: "what is graphql"
2. Watch **server console** for:
   ```
   🔍 Searching for similar content: { query: 'what is graphql', agentId: X }
   ✅ Generated query embedding: 1536 dimensions
   ✅ Found 5 matching chunks with similarity > 0.5
   📝 RAG context length: 3500 characters
   ```

If you see "Found 0 matching chunks", the embeddings weren't stored or the search function is missing.

## Common Errors & Solutions

### Error: "Could not find the table 'public.agents'"
**Solution:** Run the SQL migration (Step 2)

### Error: "Missing OpenAI API key"
**Solution:** Add `OPENAI_API_KEY=sk-...` to `.env`

### Error: "No content extracted from file"
**Solution:** 
- Make sure you're uploading a valid PDF
- Check PDF isn't password-protected or scanned image
- Try a text file (.txt) as a test

### Error: "function match_agent_content does not exist"
**Solution:** Run the vector migration:
```sql
-- In Supabase SQL Editor
create extension if not exists vector;
-- Then run: supabase/migrations/20240000000001_init_vector.sql
```

### No Errors But Still Generic Answers
**Check:**
1. Lower the similarity threshold in `lib/db/vector.ts`:
   ```typescript
   matchThreshold = 0.3  // Try lower value
   ```
2. Verify embeddings exist:
   ```sql
   SELECT agent_id, array_length(chunks, 1) as chunk_count 
   FROM agent_training_data;
   ```
3. Check server console for "Found 0 matching chunks"

## Verify It's Working

You'll know RAG is working when:
1. ✅ Upload shows success with chunk count
2. ✅ Server logs show "Found X matching chunks" > 0
3. ✅ Agent response includes specific content from your PDF
4. ✅ Agent says things like "Based on the document..." or quotes text

## Quick Test Commands

```powershell
# Check environment
npx tsx scripts/debug-rag.ts

# Check if tables exist (requires DATABASE_URL set)
pnpm db:studio

# View server logs in real-time
# Just watch the terminal where 'pnpm dev' is running
```

## Still Not Working?

Share these details:
1. Output of `npx tsx scripts/debug-rag.ts`
2. Server console logs when uploading PDF
3. Server console logs when sending chat message
4. Screenshot of your Supabase Storage buckets
5. Result of this SQL query:
   ```sql
   SELECT COUNT(*) FROM agent_training_data;
   ```

