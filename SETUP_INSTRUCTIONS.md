# Agent Chat App - Setup Instructions

## Issues Fixed

### 1. ✅ Console Error: "Error fetching agents"
- **Root cause**: Supabase tables (`agents`, `usage_limits`) don't exist in your new database
- **Fix**: Run the SQL migration to create all required tables

### 2. ✅ Agent Not Using Uploaded PDF Content
- **Root cause**: PDF text extraction was not implemented (returned empty string)
- **Fix**: Implemented PDF parsing using `pdf-parse` library
- **Bonus**: Improved RAG prompt to explicitly use document context

## Setup Steps

### Step 1: Fix Database Connection (if needed)

If you see `ENOTFOUND` errors, your Supabase project might be paused or the connection string is wrong.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Check if your project is **Paused** → Click "Restore" if needed
3. Get the correct connection strings:
   - Go to **Project Settings** → **Database**
   - Copy the **URI** connection string
   - Copy your **database password** (you set this when creating the project)

4. Update your `.env` file:
```env
# Supabase Connection (all must point to the SAME project)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SERVICE_ROLE_KEY=your_service_role_key_here

# Database URL for Drizzle migrations
DATABASE_URL=postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require

# OpenAI API Key (required for embeddings and chat)
OPENAI_API_KEY=sk-...
```

### Step 2: Create Database Tables

You have **two options**:

#### Option A: Run SQL in Supabase Dashboard (Recommended for quick setup)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Open the file `supabase/migrations/00_complete_setup.sql` from this project
3. Copy the entire SQL content
4. Paste into the SQL Editor
5. Click **Run**

This creates:
- All tables (`agents`, `usage_limits`, `chat_sessions`, `chat_messages`, `agent_training_data`, etc.)
- Vector extension for embeddings
- RLS policies for security
- Indexes for performance

#### Option B: Use Drizzle CLI (for version-controlled migrations)

```powershell
# Make sure DATABASE_URL is set in .env
pnpm db:migrate
```

### Step 3: Restart Your App

```powershell
# Stop the dev server (Ctrl+C)
# Start it again
pnpm dev
```

### Step 4: Test the RAG Pipeline

1. **Create a new agent** (or edit existing one)
   - Give it a name like "GraphQL Expert"
   - Set topic expertise: "GraphQL"
   - Upload your GraphQL PDF book

2. **Wait for processing** (check console for "Document processed" logs)

3. **Chat with the agent**
   - Ask: "What is GraphQL?"
   - The agent should now answer using content from your PDF!

## How It Works Now

### PDF Upload Flow
1. User uploads PDF → `uploadAgentResource()` in `lib/agent-resources.ts`
2. PDF text is extracted using `pdf-parse` library
3. Text is split into chunks (1000 chars, 200 overlap)
4. Each chunk is converted to embeddings using OpenAI `text-embedding-3-small`
5. Embeddings stored in `agent_training_data` table with pgvector

### Chat Flow (RAG)
1. User asks question → `POST /api/chat`
2. Question is converted to embedding
3. Vector similarity search finds relevant chunks from uploaded docs
4. Relevant chunks are injected into system prompt as CONTEXT
5. OpenAI generates answer based on context + agent expertise
6. Response sent back to user

## Troubleshooting

### "Table 'agents' does not exist"
- Run Step 2 to create tables

### "Extension 'vector' does not exist"
- The SQL migration enables it automatically
- If manual setup: Run `create extension if not exists vector;` in SQL Editor

### PDF content not being used
- Check console for errors during upload
- Verify `OPENAI_API_KEY` is set in `.env`
- Check `agent_training_data` table has rows for your agent:
  ```sql
  select agent_id, length(content), array_length(chunks, 1) as chunk_count 
  from agent_training_data;
  ```

### Agent gives generic answers
- Lower the `match_threshold` in `searchSimilarContent()` (currently 0.7)
- Check if embeddings were created (query above)
- Verify OpenAI API key has credits

## Next Steps

- [ ] Test creating an agent with PDF upload
- [ ] Verify agent answers from PDF content
- [ ] Check token usage tracking in sidebar
- [ ] Test with different document types (text files work too!)

## Files Modified

1. `lib/agent-resources.ts` - Implemented PDF text extraction
2. `app/api/chat/route.ts` - Improved RAG prompt injection
3. `app/page.tsx` - Graceful error handling for missing tables
4. `hooks/use-token-limits.ts` - Handle missing usage_limits table
5. `components/browse-agent.tsx` - Added "Go to Home" link for empty state
6. `supabase/migrations/00_complete_setup.sql` - Complete database setup (NEW)

## Support

If you encounter issues:
1. Check browser console for errors
2. Check server console (where `pnpm dev` is running)
3. Verify all env variables are set correctly
4. Ensure Supabase project is active (not paused)

