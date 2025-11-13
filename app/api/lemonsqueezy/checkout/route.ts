import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required environment variables
    const storeId = process.env.LEMONSQUEEZY_STORE_ID
    // Support both VARIANT_ID and PRODUCT_ID for backwards compatibility
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID || process.env.LEMONSQUEEZY_PRODUCT_ID
    
    if (!storeId || !variantId) {
      console.error('Missing LemonSqueezy configuration:', { 
        storeId: !!storeId, 
        variantId: !!variantId,
        hasProductId: !!process.env.LEMONSQUEEZY_PRODUCT_ID,
        hasVariantId: !!process.env.LEMONSQUEEZY_VARIANT_ID
      })
      return NextResponse.json({ 
        error: 'Payment system not configured. Please contact support.' 
      }, { status: 500 })
    }

    // Create LemonSqueezy checkout URL with proper format
    // Format: https://STORE_NAME.lemonsqueezy.com/checkout/buy/VARIANT_ID
    const checkoutUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(user.email || '')}&checkout[custom][user_id]=${user.id}`

    console.log('✅ Generated checkout URL for user:', user.id)
    console.log('🔗 Checkout URL:', checkoutUrl)
    console.log('📦 Store ID:', storeId)
    console.log('🏷️  Variant/Product ID:', variantId)
    
    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}