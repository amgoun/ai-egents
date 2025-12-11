import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Temporary API endpoint to fix missing usage_limits records
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if usage_limits record exists
    const now = new Date()
    const { data: existingUsage } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_end', now.toISOString())
      .limit(1)
      .single()

    if (existingUsage) {
      return NextResponse.json({ 
        message: 'Usage limits already exist',
        usage: existingUsage
      })
    }

    // Fix existing record with null values or create new one
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // First, try to update the existing record to fix null values
    const { data: existingRecord } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (existingRecord) {
      // Update existing record to fix null values
      const { data: updatedUsage, error: updateError } = await supabase
        .from('usage_limits')
        .update({
          plan_type: 'pro',
          tokens_limit: 10_000_000,
          tokens_used: existingRecord.tokens_used || 0,
          message_count: existingRecord.message_count || 0,
          agent_count: existingRecord.agent_count || 0,
          avatars_limit: 50,
          avatars_generated: existingRecord.avatars_generated || 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString()
        })
        .eq('id', existingRecord.id)
        .select()
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Usage limits fixed and updated successfully',
        usage: updatedUsage
      })
    }

    // Create new record if none exists
    const { data: newUsage, error: insertError } = await supabase
      .from('usage_limits')
      .insert({
        user_id: user.id,
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
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Usage limits initialized successfully',
      usage: newUsage
    })
  } catch (error) {
    console.error('Fix usage limits error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
