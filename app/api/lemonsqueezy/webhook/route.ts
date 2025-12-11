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
    console.log('📬 Webhook received:', event.meta.event_name)
    
    switch (event.meta.event_name) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_payment_success':
        const userId = event.meta.custom_data?.user_id
        
        if (!userId) {
          console.error('❌ No user_id found in webhook data')
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        
        // Calculate period dates (monthly subscription)
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        
        // First check if usage_limits record exists
        const { data: existingUsage } = await supabase
          .from('usage_limits')
          .select('id')
          .eq('user_id', userId)
          .gte('period_end', now.toISOString())
          .limit(1)
          .single()
        
        if (existingUsage) {
          // Update existing record - preserve message_count and agent_count
          const { data: currentData } = await supabase
            .from('usage_limits')
            .select('message_count, agent_count')
            .eq('id', existingUsage.id)
            .single()
          
          const { error: updateError } = await supabase
            .from('usage_limits')
            .update({
              plan_type: 'pro',
              tokens_limit: 10_000_000,
              tokens_used: 0,
              message_count: currentData?.message_count || 0,
              agent_count: currentData?.agent_count || 0,
              avatars_limit: 50,
              avatars_generated: 0,
              period_start: periodStart.toISOString(),
              period_end: periodEnd.toISOString()
            })
            .eq('id', existingUsage.id)
          
          if (updateError) {
            console.error('❌ Database update error:', updateError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
          }
          console.log(`✅ Updated existing usage_limits for user ${userId}`)
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('usage_limits')
            .insert({
              user_id: userId,
              plan_type: 'pro',
              tokens_limit: 10_000_000,
              tokens_used: 0,
              message_count: 0,
              agent_count: 0,
              avatars_limit: 50,
              avatars_generated: 0,
              period_start: periodStart.toISOString(),
              period_end: periodEnd.toISOString()
            })
          
          if (insertError) {
            console.error('❌ Database insert error:', insertError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
          }
          console.log(`✅ Created new usage_limits for user ${userId}`)
        }
        
        console.log(`✅ User ${userId} upgraded to Pro`)
        console.log(`   - 10M Tokens (reset to 0)`)
        console.log(`   - 50 Avatar generations`)
        console.log(`   - Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`)
        break

      case 'subscription_cancelled':
      case 'subscription_expired':
        const cancelledUserId = event.meta.custom_data?.user_id
        
        if (!cancelledUserId) {
          console.error('❌ No user_id found in webhook data')
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        
        // Downgrade to free plan
        const { error: downgradeError } = await supabase
          .from('usage_limits')
          .update({
            plan_type: 'free',
            tokens_limit: 250_000,
            avatars_limit: 5
          })
          .eq('user_id', cancelledUserId)
        
        if (downgradeError) {
          console.error('❌ Database downgrade error:', downgradeError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        
        console.log(`❌ User ${cancelledUserId} downgraded to Free`)
        console.log(`   - 250K Tokens`)
        console.log(`   - 5 Avatar generations`)
        break
        
      default:
        console.log(`ℹ️ Unhandled event: ${event.meta.event_name}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}