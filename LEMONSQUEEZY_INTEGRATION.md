# LemonSqueezy Integration Guide

## Overview
Integrate LemonSqueezy for Pro plan payments ($30/month) that gives users:
- ✅ 10M tokens per month
- ✅ Unlimited agents
- ✅ Token resets on 11/30/2025 (or monthly)

---

## Step 1: Create LemonSqueezy Account

1. Go to [LemonSqueezy.com](https://lemonsqueezy.com)
2. Sign up and create a store
3. Create a product: **"Agent Chat App Pro"**
   - Price: $30/month
   - Recurring: Monthly
   - Description: "10M Tokens + Unlimited Agents"

---

## Step 2: Get API Keys

1. Go to Settings → API
2. Copy your **API Key**
3. Add to `.env.local`:
   ```env
   LEMONSQUEEZY_API_KEY=your_api_key_here
   LEMONSQUEEZY_STORE_ID=your_store_id
   LEMONSQUEEZY_PRODUCT_ID=your_product_id
   LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
   ```

---

## Step 3: Install LemonSqueezy SDK

```bash
pnpm add @lemonsqueezy/lemonsqueezy.js
```

---

## Step 4: Create Checkout API

Create `app/api/lemonsqueezy/checkout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create LemonSqueezy checkout
    const checkoutUrl = `https://your-store.lemonsqueezy.com/checkout/buy/${process.env.LEMONSQUEEZY_PRODUCT_ID}?checkout[email]=${user.email}&checkout[custom][user_id]=${user.id}`

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
```

---

## Step 5: Create Webhook Handler

Create `app/api/lemonsqueezy/webhook/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-signature')
    
    // Verify webhook signature
    const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
    const digest = hmac.update(body).digest('hex')
    
    if (signature !== digest) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const supabase = await createClient()

    // Handle different events
    switch (event.meta.event_name) {
      case 'subscription_created':
      case 'subscription_updated':
        const userId = event.meta.custom_data.user_id
        
        // Update user to Pro plan with 10M tokens
        await supabase
          .from('usage_limits')
          .update({
            plan_type: 'pro',
            tokens_limit: 10_000_000,
            tokens_used: 0,
            period_start: new Date().toISOString(),
            period_end: new Date('2025-11-30').toISOString()
          })
          .eq('user_id', userId)
        
        console.log(`✅ User ${userId} upgraded to Pro`)
        break

      case 'subscription_cancelled':
      case 'subscription_expired':
        const cancelledUserId = event.meta.custom_data.user_id
        
        // Downgrade to free plan
        await supabase
          .from('usage_limits')
          .update({
            plan_type: 'free',
            tokens_limit: 250_000
          })
          .eq('user_id', cancelledUserId)
        
        console.log(`❌ User ${cancelledUserId} downgraded to Free`)
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
```

---

## Step 6: Update Pro Panel Component

Update your Pro panel to trigger checkout:

```typescript
// In your Pro panel component
const handleUpgrade = async () => {
  try {
    const response = await fetch('/api/lemonsqueezy/checkout', {
      method: 'POST'
    })
    
    const { checkoutUrl } = await response.json()
    
    // Redirect to LemonSqueezy checkout
    window.location.href = checkoutUrl
  } catch (error) {
    console.error('Upgrade error:', error)
    toast.error('Failed to start checkout')
  }
}

// In your JSX
<Button onClick={handleUpgrade}>
  👑 Upgrade to Pro - $30/month
</Button>
```

---

## Step 7: Configure Webhook in LemonSqueezy

1. Go to LemonSqueezy Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/lemonsqueezy/webhook`
3. Select events:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_expired`
4. Copy the webhook secret → add to `.env.local`

---

## Step 8: Test the Flow

### Test Checkout:
1. Click "Upgrade to Pro" button
2. Should redirect to LemonSqueezy checkout
3. Use test card: `4242 4242 4242 4242`
4. Complete payment

### Verify Upgrade:
1. Check `usage_limits` table:
   ```sql
   SELECT * FROM usage_limits WHERE user_id = 'your-user-id';
   ```
2. Should show:
   - `plan_type`: 'pro'
   - `tokens_limit`: 10000000
   - `tokens_used`: 0

### Test Token Usage:
1. Generate an avatar (costs 5,000 tokens)
2. Check sidebar - should show tokens deducted
3. Verify in database

---

## Token Cost Structure

| Action | Token Cost |
|--------|-----------|
| Chat message (avg) | 500-2000 |
| Avatar generation | 5,000 |
| Document upload | 1,000-5,000 |

### Free Plan:
- 250,000 tokens/month
- ~50 avatar generations OR
- ~125 chat messages

### Pro Plan ($30/month):
- 10,000,000 tokens/month
- ~2,000 avatar generations OR
- ~5,000 chat messages
- Resets monthly

---

## Environment Variables Summary

```env
# LemonSqueezy
LEMONSQUEEZY_API_KEY=lemon_api_xxx
LEMONSQUEEZY_STORE_ID=12345
LEMONSQUEEZY_PRODUCT_ID=67890
LEMONSQUEEZY_WEBHOOK_SECRET=whsec_xxx

# Existing
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://xxx
OPENAI_API_KEY=sk-xxx
```

---

## Testing Webhooks Locally

Use ngrok to test webhooks on localhost:

```bash
# Install ngrok
npm install -g ngrok

# Start your app
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Add to LemonSqueezy webhook: https://abc123.ngrok.io/api/lemonsqueezy/webhook
```

---

## Security Checklist

- ✅ Verify webhook signatures
- ✅ Use environment variables for secrets
- ✅ Validate user_id in webhook events
- ✅ Log all subscription changes
- ✅ Handle failed payments gracefully
- ✅ Test with LemonSqueezy test mode first

---

## Next Steps

1. Create LemonSqueezy account and product
2. Add API keys to `.env.local`
3. Create checkout and webhook API routes
4. Update Pro panel with checkout button
5. Configure webhook in LemonSqueezy dashboard
6. Test with test card
7. Go live!

---

## Support

- LemonSqueezy Docs: https://docs.lemonsqueezy.com
- LemonSqueezy Discord: https://discord.gg/lemonsqueezy
- Your support: [your-email@example.com]

