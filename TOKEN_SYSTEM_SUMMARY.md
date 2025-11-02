# Token System & Avatar Generation - Summary

## ✅ What's Implemented

### 1. Token-Based Avatar Generation
- **Cost**: 5,000 tokens per avatar generation
- **Check balance** before generating
- **Deduct tokens** after successful generation
- **Show remaining tokens** in toast notification

### 2. Token Protection
- Users must have sufficient tokens to generate avatars
- Clear error message when tokens run out
- Upgrade prompt to Pro plan
- Unlimited uploads (no token cost)

### 3. Per-Agent Limit
- Each agent can have **1 AI-generated avatar**
- Users can **regenerate** (replace) unlimited times (costs tokens each time)
- Users can **upload** custom images unlimited times (free)

---

## Token Costs

| Action | Token Cost | Notes |
|--------|-----------|-------|
| **Avatar Generation** | 5,000 | DALL-E 2, 512x512 |
| Avatar Regeneration | 5,000 | Replacing existing avatar |
| **Document Upload** | ~250 per chunk | Embedding generation (varies by size) |
| Small PDF (10 pages) | ~2,500 | ~10 chunks |
| Large PDF (50 pages) | ~12,500 | ~50 chunks |
| Chat Message (avg) | 500-2,000 | Varies by length + context |
| Custom Avatar Upload | 0 | Free, unlimited |

---

## Plans

### Free Plan
- **250,000 tokens/month**
- Resets monthly
- ~50 avatar generations OR
- ~125 chat messages
- Limited agents

### Pro Plan ($30/month)
- **10,000,000 tokens/month**
- Resets 11/30/2025 (or monthly)
- ~2,000 avatar generations OR
- ~5,000 chat messages
- Unlimited agents

---

## User Flow

### Generating Avatar:

1. **User clicks "Generate Avatar"**
   - System checks token balance
   - If insufficient: Show error + upgrade prompt
   - If sufficient: Generate avatar

2. **Avatar Generated**
   - Deduct 5,000 tokens
   - Upload to Supabase storage
   - Delete old avatar (if exists)
   - Show success + tokens remaining

3. **Regenerating Avatar**
   - Same process
   - Costs 5,000 tokens again
   - Replaces existing avatar

4. **Uploading Custom Image**
   - No token cost
   - Unlimited uploads
   - Replaces existing avatar

---

## Console Logs (for debugging)

When generating avatar, you'll see:
```
💰 Checking token balance...
User has 245,000 tokens remaining
🎨 Calling DALL-E API...
DALL-E response: { ... }
Generated image URL: https://...
Downloading generated image...
🗑️ Deleting old avatar: user123/1234567890.png
✅ Old avatar deleted successfully
Uploading to Supabase storage...
Upload successful: { path: '...', url: '...' }
💸 Deducting 5,000 tokens...
✅ Tokens deducted. Remaining: 240,000
```

When insufficient tokens:
```
💰 Checking token balance...
User has 2,000 tokens remaining
❌ Insufficient tokens for avatar generation
```

---

## Frontend Integration

### Success Toast:
```
✅ Avatar generated successfully!
Used 5,000 tokens. 240,000 remaining.
```

### Insufficient Tokens Toast:
```
❌ Insufficient Tokens
Avatar generation requires 5,000 tokens. 
You have 2,000 tokens remaining. 
Upgrade to Pro for 10M tokens!
```

---

## Database Schema

### `usage_limits` table:
```sql
- user_id: text
- tokens_used: integer (current usage)
- tokens_limit: integer (250K free, 10M pro)
- plan_type: text ('free' or 'pro')
- period_start: timestamp
- period_end: timestamp (reset date)
```

### `token_usage` table (audit log):
```sql
- user_id: text
- tokens_used: integer
- model_used: text ('dall-e-2', 'gpt-4o-mini', 'gpt-4o', etc.)
- operation_type: text ('avatar_generation', 'chat', 'document_upload', etc.)
- created_at: timestamp
```

---

## LemonSqueezy Integration

See `LEMONSQUEEZY_INTEGRATION.md` for complete setup guide.

### Quick Steps:
1. Create LemonSqueezy product ($30/month)
2. Add API keys to `.env.local`
3. Create checkout API route
4. Create webhook handler
5. Update Pro panel button
6. Test with test card
7. Go live!

---

## Testing

### Test Token Deduction:
1. Check current tokens in sidebar
2. Generate avatar
3. Verify tokens deducted (should be -5,000)
4. Check `token_usage` table for log entry

### Test Insufficient Tokens:
1. Manually set `tokens_used` to 248,000 (only 2K remaining)
2. Try to generate avatar
3. Should see error message
4. Should NOT call DALL-E API

### Test Regeneration:
1. Generate avatar for agent
2. Generate again (regenerate)
3. Should cost 5,000 tokens again
4. Old avatar should be deleted
5. New avatar should appear

---

## Cost Analysis (Updated for GPT-4o-mini)

### For You (API Costs):
- DALL-E 2: ~$0.02 per image
- **GPT-4o-mini: ~$0.00015 per 1K input tokens, ~$0.0006 per 1K output tokens**
- GPT-4o: ~$0.0025 per 1K input tokens, ~$0.01 per 1K output tokens
- Embeddings: ~$0.0001 per 1K tokens

### For Users (Token Costs):
- Avatar: 5,000 tokens
- Chat: 500-2,000 tokens
- Upload: 1,000-5,000 tokens

### Revenue Model (Using GPT-4o-mini):
- Free users: 250K tokens/month (limited usage, encourage upgrade)
- Pro users: $30/month for 10M tokens
- **Your cost per Pro user:**
  - Average usage: 5M tokens
  - Chat cost: ~$3 (5M tokens @ GPT-4o-mini rates)
  - Avatar cost: ~$0.40 (20 avatars @ $0.02 each)
  - Document embeddings: ~$0.50
  - **Total cost: ~$3-4/month per Pro user**
- **Profit: ~$26-27 per Pro user/month** ✅ HIGHLY PROFITABLE!

---

## Next Steps

1. ✅ Token system implemented
2. ✅ Avatar generation with token deduction
3. ✅ Insufficient tokens handling
4. ⏳ Set up LemonSqueezy account
5. ⏳ Create checkout flow
6. ⏳ Set up webhook handler
7. ⏳ Test payment flow
8. ⏳ Go live!

---

## Files Modified

1. `app/api/agents/avatar/generate/route.ts` - Token checking & deduction
2. `components/agent-avatar.tsx` - Frontend token handling
3. `LEMONSQUEEZY_INTEGRATION.md` - Payment integration guide
4. `TOKEN_SYSTEM_SUMMARY.md` - This file

---

## Support

If you need help:
1. Check console logs for detailed debugging
2. Verify token balance in database
3. Check `token_usage` table for audit trail
4. Review LemonSqueezy webhook logs
5. Test with different token amounts

Everything is ready! Just need to set up LemonSqueezy and you're good to go! 🚀

