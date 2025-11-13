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