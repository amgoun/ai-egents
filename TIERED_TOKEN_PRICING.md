# 🎯 Tiered Token Pricing System

## Overview

Your app now uses a **tiered token pricing model** where different AI models cost different amounts of tokens. This keeps you profitable while giving users flexibility to choose between efficiency and quality.

---

## 💰 Token Pricing by Model

| Model | Token Multiplier | Best For | Your API Cost |
|-------|-----------------|----------|---------------|
| **GPT-4o Mini** | **1x** (base rate) | Most use cases, best value | $0.00045/1K tokens |
| **GPT-4o** | **3x** | Premium quality, complex tasks | $0.00675/1K tokens |
| **Claude 3.5 Sonnet** | **2x** | Balanced performance | ~$0.003/1K tokens |
| **Claude 3.7 Sonnet** | **2.5x** | Latest, highest quality | ~$0.004/1K tokens |

---

## 📊 Example: Same Chat Message

**User sends:** "Explain quantum computing" (500 tokens actual)

| Model | Tokens Charged to User | Your Cost | User's Cost (at $30/10M) |
|-------|------------------------|-----------|--------------------------|
| GPT-4o Mini | 500 tokens | $0.00023 | $0.0015 |
| GPT-4o | 1,500 tokens (3x) | $0.00338 | $0.0045 |
| Claude 3.5 | 1,000 tokens (2x) | $0.0015 | $0.003 |
| Claude 3.7 | 1,250 tokens (2.5x) | $0.002 | $0.00375 |

**Your profit per message:**
- GPT-4o Mini: $0.00127 ✅ (Best margin!)
- GPT-4o: $0.00112 ✅ (Still profitable)
- Claude 3.5: $0.0015 ✅ (Good profit)
- Claude 3.7: $0.00175 ✅ (Good profit)

---

## 🎨 Avatar Generation Limits

### Pricing:
- **Cost:** 10,000 tokens per avatar
- **Your API cost:** ~$0.02 (DALL-E 2)
- **User's cost:** $0.03 (10K tokens at $30/10M)
- **Your profit:** $0.01 per avatar ✅

### Limits:
| Plan | AI Avatars/Month | Custom Uploads | Regenerations |
|------|------------------|----------------|---------------|
| **Free** | 5 avatars | Unlimited (free) | Costs tokens each time |
| **Pro** | 50 avatars | Unlimited (free) | Costs tokens each time |

### How it Works:
1. **New Generation:** Counts against monthly limit + costs 10K tokens
2. **Regeneration:** Doesn't count against limit, but still costs 10K tokens
3. **Custom Upload:** Free, unlimited, doesn't count against anything

---

## 📈 Plan Economics

### Free Plan (250K tokens/month)
**Token Usage:**
- 25 avatars (at 10K each) = 250K tokens OR
- 250 chat messages (GPT-4o Mini) = 250K tokens OR
- 83 chat messages (GPT-4o) = 250K tokens

**Your Cost:** ~$0.50/month
**Revenue:** $0 (free tier)
**Purpose:** Lead generation, conversion to Pro

### Pro Plan (10M tokens/month - $30)
**Typical Usage:**
- Chat (5M tokens): 5,000 messages on GPT-4o Mini
- Avatars (50K tokens): 5 avatars
- Documents (100K tokens): 40 PDFs

**Your Cost:** ~$3-4/month
**Revenue:** $30/month
**Profit:** $26-27/month ✅

---

## 🎯 Profitability Analysis

### Scenario 1: User Chooses GPT-4o Mini (Most Common)
- **Usage:** 5M tokens (5,000 chats)
- **Your cost:** $2.25
- **Revenue:** $30
- **Profit:** $27.75 ✅ (92% margin!)

### Scenario 2: User Chooses GPT-4o (Power User)
- **Usage:** 3.3M tokens actual (1,000 chats × 3x multiplier = 3M charged)
- **Your cost:** $22.28
- **Revenue:** $30
- **Profit:** $7.72 ✅ (26% margin)

### Scenario 3: Mixed Usage (Realistic)
- **GPT-4o Mini:** 4M tokens (4,000 chats) = $1.80
- **GPT-4o:** 1M tokens charged (333 chats × 3x) = $2.25 actual cost
- **Avatars:** 10 generations = $0.20
- **Total cost:** $4.25
- **Revenue:** $30
- **Profit:** $25.75 ✅ (86% margin!)

---

## 🚀 User Experience

### Model Selection (Agent Creation):
Users see clear descriptions:
- **GPT-4o Mini** - "Best value - 1x tokens" ⭐
- **GPT-4o** - "Premium quality - 3x tokens"
- **Claude 3.5 Sonnet** - "Balanced - 2x tokens"
- **Claude 3.7 Sonnet** - "Latest - 2.5x tokens"

### Avatar Generation:
- Shows remaining avatars: "5/50 avatars used"
- Shows token cost: "Costs 10,000 tokens"
- Clear upgrade prompts when limits reached

### Token Display:
- Sidebar shows: "8.5M / 10M tokens"
- After chat: "Used 1,500 tokens (GPT-4o)"
- Clear indication of model costs

---

## 📱 Implementation Details

### Files Changed:
1. `lib/utils/token-counter.ts` - Model multipliers and avatar limits
2. `lib/db/schema.ts` - Added avatar tracking columns
3. `app/api/agents/avatar/generate/route.ts` - Avatar limit enforcement
4. `hooks/use-token-limits.ts` - Avatar limit tracking
5. `components/create-agent.tsx` - Model cost display
6. `supabase/migrations/20240000000007_add_avatar_limits.sql` - Database migration

### Database Schema:
```sql
ALTER TABLE usage_limits ADD COLUMN avatars_generated INTEGER DEFAULT 0;
ALTER TABLE usage_limits ADD COLUMN avatars_limit INTEGER DEFAULT 5;
```

### Token Calculation:
```typescript
const baseTokens = Math.ceil(text.length / 4)
const multiplier = MODEL_TOKEN_MULTIPLIERS[model] || 1.0
const chargedTokens = Math.ceil(baseTokens * multiplier)
```

---

## 🎁 Benefits

### For You:
✅ **Highly profitable** on all models
✅ **Sustainable** business model
✅ **Scalable** - more users = more profit
✅ **Flexible** - can adjust multipliers anytime
✅ **Protected** - avatar limits prevent abuse

### For Users:
✅ **Choice** - pick efficiency vs quality
✅ **Transparency** - clear token costs
✅ **Fair** - pay for what you use
✅ **Generous** - 10M tokens goes far on GPT-4o Mini
✅ **Flexible** - switch models per agent

---

## 🔧 Configuration

### Adjust Token Multipliers:
Edit `lib/utils/token-counter.ts`:
```typescript
export const MODEL_TOKEN_MULTIPLIERS = {
  'gpt-4o-mini': 1.0,  // Change these values
  'gpt-4o': 3.0,       // to adjust pricing
  'claude-3.5-sonnet': 2.0,
  'claude-3.7-sonnet': 2.5,
}
```

### Adjust Avatar Limits:
Edit `lib/utils/token-counter.ts`:
```typescript
export function getAvatarLimitForPlan(planType: string): number {
  switch (planType.toLowerCase()) {
    case 'pro':
      return 50  // Change this
    case 'free':
    default:
      return 5   // Change this
  }
}
```

### Adjust Avatar Cost:
Edit `lib/utils/token-counter.ts`:
```typescript
export const AVATAR_GENERATION_COST = 10_000 // Change this
```

---

## 📊 Monitoring

### Check Profitability:
```sql
-- Average tokens per user by model
SELECT 
  model_used,
  AVG(tokens_used) as avg_tokens,
  COUNT(*) as requests,
  SUM(tokens_used) as total_tokens
FROM token_usage
WHERE operation_type = 'chat'
GROUP BY model_used;

-- Avatar generation stats
SELECT 
  plan_type,
  AVG(avatars_generated) as avg_avatars,
  COUNT(*) as users
FROM usage_limits
GROUP BY plan_type;
```

### OpenAI Dashboard:
- Monitor costs by model
- Should see mostly GPT-4o-mini usage
- Costs should be ~$3-4 per Pro user

---

## ✅ Success Metrics

Your system is working well if:
- ✅ 70%+ users choose GPT-4o Mini (most efficient)
- ✅ Average cost per Pro user: $3-5/month
- ✅ Profit margin: 80%+
- ✅ Users stay within avatar limits
- ✅ Few upgrade requests (limits are generous)

---

## 🎉 Summary

**You now have a sustainable, profitable, flexible pricing model!**

- Users get choice and transparency
- You make profit on every model
- Avatar generation is profitable
- System prevents abuse
- Easy to adjust pricing
- Scales beautifully

**Your $30/month Pro plan is now a money-maker!** 🚀

