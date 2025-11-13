# 🍋 LemonSqueezy Setup Checklist

## ✅ Completed Steps (1-5)

- [x] **Step 1:** Created LemonSqueezy account
- [x] **Step 2:** Got API keys and added to `.env.local`
- [x] **Step 3:** Installed LemonSqueezy SDK
- [x] **Step 4:** Created checkout API route
- [x] **Step 5:** Created webhook handler

---

## 📋 Remaining Steps (6-8)

### ✅ Step 6: Update Pro Panel Component (COMPLETED)

**What was done:**
- ✅ Updated `components/sidebar.tsx` - Upgrade button now calls LemonSqueezy checkout
- ✅ Updated `components/chat/token-limit-warning.tsx` - Warning upgrade button integrated

**How it works:**
```typescript
// When user clicks "Upgrade to Pro"
1. Calls /api/lemonsqueezy/checkout
2. Gets checkout URL from LemonSqueezy
3. Redirects user to payment page
4. After payment, webhook updates database
```

---

### 🔧 Step 7: Configure Webhook in LemonSqueezy Dashboard

**To Do:**

1. **Go to LemonSqueezy Dashboard:**
   - Login at https://app.lemonsqueezy.com
   - Navigate to: **Settings → Webhooks**

2. **Add New Webhook:**
   - Click "Add endpoint"
   - **URL:** `https://your-domain.com/api/lemonsqueezy/webhook`
   - **For local testing:** Use ngrok (see below)

3. **Select Events:**
   - ✅ `subscription_created`
   - ✅ `subscription_updated`
   - ✅ `subscription_cancelled`
   - ✅ `subscription_expired`
   - ✅ `subscription_payment_success`

4. **Get Webhook Secret:**
   - After creating webhook, copy the **Signing Secret**
   - Add to `.env.local`:
   ```env
   LEMONSQUEEZY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

5. **Save and Activate:**
   - Click "Save"
   - Ensure webhook is **Active**

---

### 🧪 Step 8: Test the Complete Flow

#### **A. Test Locally with ngrok (Recommended First)**

1. **Install ngrok:**
```bash
npm install -g ngrok
```

2. **Start your app:**
```bash
npm run dev
```

3. **In another terminal, start ngrok:**
```bash
ngrok http 3000
```

4. **Copy ngrok URL:**
   - You'll see: `Forwarding https://abc123.ngrok.io -> http://localhost:3000`
   - Copy the `https://abc123.ngrok.io` URL

5. **Update LemonSqueezy webhook:**
   - Go to LemonSqueezy Dashboard → Webhooks
   - Update URL to: `https://abc123.ngrok.io/api/lemonsqueezy/webhook`

6. **Test checkout:**
   - Click "Upgrade to Pro" in your app
   - Should redirect to LemonSqueezy checkout
   - Use **test card:** `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

7. **Verify webhook received:**
   - Check your terminal logs
   - Should see: `✅ User [user-id] upgraded to Pro`

8. **Verify database:**
```sql
SELECT user_id, plan_type, tokens_limit, avatars_limit 
FROM usage_limits 
WHERE user_id = 'your-user-id';

-- Should show:
-- plan_type: 'pro'
-- tokens_limit: 10000000
-- avatars_limit: 50
```

---

#### **B. Test in Production**

1. **Deploy your app:**
   - Deploy to Vercel/Netlify/etc.
   - Get production URL: `https://your-app.com`

2. **Update LemonSqueezy webhook:**
   - Change URL to: `https://your-app.com/api/lemonsqueezy/webhook`

3. **Enable Live Mode:**
   - In LemonSqueezy, switch from Test Mode to Live Mode
   - Update `.env.local` with **live API keys**

4. **Test with real payment:**
   - Click "Upgrade to Pro"
   - Complete real payment
   - Verify upgrade works

---

## 🔍 Verification Checklist

After completing all steps, verify:

### Frontend:
- [ ] "Upgrade to Pro" button visible for free users
- [ ] Button shows loading state when clicked
- [ ] Redirects to LemonSqueezy checkout page
- [ ] Checkout page has correct product ($30/month)
- [ ] User email is pre-filled

### Backend:
- [ ] Webhook endpoint is accessible
- [ ] Webhook signature verification works
- [ ] Database updates on subscription_created
- [ ] User gets 10M tokens on upgrade
- [ ] User gets 50 avatar limit on upgrade
- [ ] Tokens reset to 0 on upgrade

### User Experience:
- [ ] After payment, user is redirected back to app
- [ ] Sidebar shows "Pro Plan Active"
- [ ] Token limit shows 10M
- [ ] Avatar limit shows X/50
- [ ] Can create unlimited agents
- [ ] Can use all AI models

---

## 🐛 Troubleshooting

### Issue: Webhook not receiving events

**Check:**
1. Webhook URL is correct and accessible
2. Webhook is **Active** in LemonSqueezy
3. Events are selected correctly
4. Webhook secret is correct in `.env.local`
5. Check LemonSqueezy webhook logs for errors

**Solution:**
```bash
# Test webhook endpoint manually
curl -X POST https://your-domain.com/api/lemonsqueezy/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return: {"received": true}
```

---

### Issue: Signature verification fails

**Check:**
1. `LEMONSQUEEZY_WEBHOOK_SECRET` is correct
2. Secret starts with `whsec_`
3. No extra spaces in `.env.local`

**Solution:**
- Re-copy webhook secret from LemonSqueezy
- Restart your dev server

---

### Issue: User not upgraded after payment

**Check:**
1. Webhook was received (check logs)
2. `user_id` is passed correctly in checkout URL
3. Database update query succeeded

**Debug:**
```sql
-- Check if user exists in usage_limits
SELECT * FROM usage_limits WHERE user_id = 'user-id';

-- Manually upgrade for testing
UPDATE usage_limits 
SET plan_type = 'pro', 
    tokens_limit = 10000000,
    avatars_limit = 50,
    tokens_used = 0
WHERE user_id = 'user-id';
```

---

### Issue: Checkout URL not generated

**Check:**
1. `LEMONSQUEEZY_STORE_ID` is your store name/slug (e.g., "my-store")
2. `LEMONSQUEEZY_VARIANT_ID` is correct (from product variant page)
3. Product variant is active in LemonSqueezy
4. User is authenticated

**Debug:**
```bash
# Check API route
curl -X POST http://localhost:3000/api/lemonsqueezy/checkout \
  -H "Cookie: your-session-cookie"

# Should return: {"checkoutUrl": "https://..."}
```

---

## 📊 Testing Scenarios

### Scenario 1: New Free User Upgrades
1. Create new account
2. Check default limits (250K tokens, 5 avatars)
3. Click "Upgrade to Pro"
4. Complete payment
5. Verify: 10M tokens, 50 avatars, plan_type = 'pro'

### Scenario 2: Pro User Cancels
1. Cancel subscription in LemonSqueezy
2. Webhook fires `subscription_cancelled`
3. Verify: Downgraded to free (250K tokens, 5 avatars)

### Scenario 3: Pro User Token Reset
1. Pro user uses 5M tokens
2. Month ends
3. Tokens should reset to 0
4. Limit stays at 10M

---

## 🎉 Success Criteria

Your LemonSqueezy integration is complete when:

✅ Free users can click "Upgrade to Pro"
✅ Redirects to LemonSqueezy checkout
✅ Payment processes successfully
✅ Webhook updates database automatically
✅ User sees "Pro Plan Active" immediately
✅ Token limit increases to 10M
✅ Avatar limit increases to 50
✅ Subscription cancellation works
✅ No errors in logs

---

## 📞 Support Resources

- **LemonSqueezy Docs:** https://docs.lemonsqueezy.com
- **Webhook Guide:** https://docs.lemonsqueezy.com/help/webhooks
- **Test Cards:** https://docs.lemonsqueezy.com/help/getting-started/test-mode
- **Discord:** https://discord.gg/lemonsqueezy

---

## 🚀 Next Steps After Setup

1. **Monitor First Payments:**
   - Watch webhook logs
   - Verify upgrades work smoothly
   - Check for any errors

2. **Add Analytics:**
   - Track conversion rate (free → pro)
   - Monitor churn rate
   - Analyze token usage patterns

3. **Improve UX:**
   - Add success page after payment
   - Send welcome email to Pro users
   - Show Pro badge on profile

4. **Marketing:**
   - Promote Pro plan benefits
   - Add testimonials
   - Create comparison table

---

## 💰 Expected Revenue

**Assumptions:**
- 100 active users
- 10% conversion to Pro
- $30/month per Pro user

**Monthly Revenue:**
- 10 Pro users × $30 = **$300/month**

**Your Costs:**
- 10 Pro users × $3 avg = **$30/month**

**Profit:**
- **$270/month** (90% margin!) 🎉

---

**You're almost done! Just complete Steps 7 & 8 and you'll be accepting payments!** 🚀

