# Avatar Generation Policy

## Current Policy (Recommended)

### What's Allowed:
- ✅ **1 AI-generated avatar per agent** (first time)
- ✅ **Unlimited regenerations** (replacing existing AI avatar)
- ✅ **Unlimited custom image uploads** (no DALL-E cost)

### Protection:
- Each agent can only have ONE AI avatar at a time
- Users can regenerate (improve) their avatar unlimited times
- No DALL-E API abuse - can't spam generate new avatars

### Cost Impact:
- **Per agent**: ~$0.02 for first generation
- **Regenerations**: ~$0.02 each (but user is improving existing avatar)
- **Uploads**: $0 (no API call)

---

## Alternative: Strict Limit (1 Generation Total)

If you want to allow only 1 AI generation per agent EVER (no regeneration), uncomment this code in `app/api/agents/avatar/generate/route.ts`:

```typescript
// Check if this agent already has an AI-generated avatar
if (oldAvatarPath) {
  return NextResponse.json(
    { 
      error: 'AI avatar already generated',
      message: 'This agent already has an AI-generated avatar. You can upload a custom image instead.'
    },
    { status: 403 }
  )
}
```

### Pros:
- Maximum cost protection
- Only $0.02 per agent ever

### Cons:
- Users can't improve their avatar
- Less flexible
- May frustrate users

---

## Alternative: Global Limit (1 Generation Per User)

To limit users to 1 AI generation total (across all agents), use this code:

```typescript
// In the "else" block (new generation)
const { data: userAgents, error: countError } = await supabase
  .from('agents')
  .select('avatar_path')
  .eq('creator_id', user.id)
  .not('avatar_path', 'is', null)

if (!countError && userAgents && userAgents.length >= 1) {
  return NextResponse.json(
    { 
      error: 'AI avatar generation limit reached',
      message: 'Pro members can generate 1 AI avatar total. You can regenerate it or upload custom images unlimited times.'
    },
    { status: 403 }
  )
}
```

### Pros:
- Strictest cost protection
- Only $0.02 per user ever

### Cons:
- Very restrictive
- Users with multiple agents can only use AI for one
- May drive users away

---

## Recommendation

**Keep the current policy** (unlimited regenerations):
- Fair to users
- Protects against abuse
- Reasonable cost ($0.02 per agent + regenerations)
- Users can improve their avatars
- Natural limit: users won't regenerate endlessly

### Expected Costs:
- 100 agents created: ~$2 (first generations)
- Regenerations: ~$5-10/month (users improving avatars)
- **Total: ~$10-15/month** for moderate usage

This is very reasonable and provides good UX!

