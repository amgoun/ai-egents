# OpenAI API Quota Issue - How to Fix

## 🔴 The Problem
Your OpenAI API key has **run out of credits**. This is preventing:
1. PDF text → embeddings conversion (when uploading documents)
2. Query → embedding conversion (when searching for relevant content)
3. AI chat responses

Error message:
```
429 You exceeded your current quota, please check your plan and billing details.
```

## ✅ Solution: Add Credits to OpenAI Account

### Step 1: Check Your Current Usage
1. Go to: https://platform.openai.com/usage
2. See how much you've used

### Step 2: Add Credits
1. Go to: https://platform.openai.com/account/billing
2. Click **"Add payment method"** (if not already added)
3. Click **"Add to credit balance"**
4. Add at least **$5-10** (recommended $10 for testing)
5. Wait 2-3 minutes for credits to activate

### Step 3: Verify Credits Are Active
1. Refresh the billing page
2. You should see your credit balance

### Step 4: Restart Your App
```powershell
# Stop the dev server (Ctrl+C)
pnpm dev
```

### Step 5: Re-Upload Your PDF
1. Go to your "graphql master" agent
2. Click **Edit Agent**
3. Upload the GraphQL PDF again
4. Watch server console for:
   ```
   📤 Starting file upload...
   📄 Extracting PDF content...
   ✅ PDF extracted: 50000 characters
   ✂️ Split into 45 chunks
   🧠 Generating embeddings with OpenAI...  ← Should work now!
   ✅ Generated 45 embeddings
   💾 Storing in database...
   ✅ Document stored successfully
   ```

### Step 6: Test Chat
Ask: "what is graphql"

You should see:
```
🔍 Searching for similar content...
✅ Found 5 matching chunks  ← Should work now!
📝 RAG context length: 3500 characters
```

And the agent should answer from your PDF content! 🎉

---

## Alternative: Use a Different API Key

If you have another OpenAI account with credits:

1. **Create a new API key:**
   - Go to: https://platform.openai.com/api-keys
   - Click **"Create new secret key"**
   - Copy the key (starts with `sk-...`)

2. **Update `.env.local`:**
   ```env
   OPENAI_API_KEY=sk-your-new-key-here
   ```

3. **Restart app:**
   ```powershell
   pnpm dev
   ```

---

## Cost Estimates

For reference, here's what you'll use:

### PDF Upload (One-time per document)
- **GraphQL book** (~50,000 characters)
- Split into ~45 chunks
- **Cost:** ~$0.001 per upload (very cheap!)

### Each Chat Message
- Query embedding: ~$0.00001
- GPT-4 response: ~$0.01-0.03 per message
- **Total per message:** ~$0.01-0.03

### Recommended Starting Balance
- **$5:** ~500 messages
- **$10:** ~1000 messages (recommended for testing)

---

## Verify Everything is Working

Run this to check your setup:
```powershell
npx tsx scripts/debug-rag.ts
```

Should show all ✅:
```
✅ agents table exists
✅ agent_training_data table exists
✅ pgvector extension working
✅ OPENAI_API_KEY: Set
✅ agent-resources bucket exists
```

---

## What We Fixed Today

1. ✅ **PDF extraction** - Now properly extracts text from PDFs
2. ✅ **Database setup** - All tables and functions exist
3. ✅ **API keys** - SERVICE_ROLE_KEY corrected
4. ✅ **Storage bucket** - Created agent-resources bucket
5. ✅ **Error handling** - Better error messages for quota issues
6. ✅ **Logging** - Detailed logs to debug issues

**Only remaining issue:** OpenAI API credits needed!

---

## Next Steps

1. ✅ Add credits to OpenAI account
2. ✅ Restart app
3. ✅ Re-upload PDF
4. ✅ Test chat
5. 🎉 Enjoy your RAG-powered agent!

