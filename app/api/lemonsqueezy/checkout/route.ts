import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if using the new UUID-based checkout URL (recommended)
    const checkoutBaseUrl = process.env.LEMONSQUEEZY_CHECKOUT_URL
    
    if (checkoutBaseUrl) {
      // Use the permanent checkout link from LemonSqueezy
      const checkoutUrl = `${checkoutBaseUrl}?checkout[email]=${encodeURIComponent(user.email || '')}&checkout[custom][user_id]=${user.id}`
      
      console.log('✅ Generated checkout URL for user:', user.id)
      console.log('🔗 Checkout URL:', checkoutUrl)
      
      return NextResponse.json({ checkoutUrl })
    }

    // Fallback to variant-based approach (legacy)
    const storeId = process.env.LEMONSQUEEZY_STORE_ID
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID || process.env.LEMONSQUEEZY_PRODUCT_ID
    
    if (!storeId || !variantId) {
      console.error('Missing LemonSqueezy configuration:', { 
        hasCheckoutUrl: !!checkoutBaseUrl,
        storeId: !!storeId, 
        variantId: !!variantId
      })
      return NextResponse.json({ 
        error: 'Payment system not configured. Please contact support.' 
      }, { status: 500 })
    }

    // Clean storeId to remove https:// or .lemonsqueezy.com if present
    const cleanStoreId = storeId.replace('https://', '').replace('.lemonsqueezy.com', '').replace(/\/$/, '');
    
    // Check if storeId looks like an ID (purely numeric) which is a common mistake
    if (/^\d+$/.test(cleanStoreId)) {
        console.warn('⚠️ Warning: LEMONSQUEEZY_STORE_ID looks like a numeric ID. It should be the store slug (e.g., "my-store").');
    }

    // Create LemonSqueezy checkout URL with proper format
    const checkoutUrl = `https://${cleanStoreId}.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(user.email || '')}&checkout[custom][user_id]=${user.id}`

    console.log('✅ Generated checkout URL for user:', user.id)
    console.log('🔗 Checkout URL:', checkoutUrl)
    console.log('📦 Store ID (env):', storeId)
    console.log('📦 Store Slug (used):', cleanStoreId)
    console.log('🏷️  Variant/Product ID:', variantId)
    
    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}