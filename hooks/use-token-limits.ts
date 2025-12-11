import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { 
  calculateRemainingTokens, 
  calculateUsagePercentage, 
  hasExceededTokenLimit,
  formatTokenCount,
  getNextResetDate
} from '@/lib/utils/token-counter'
import type { UsageLimit } from '@/lib/db/schema'

interface TokenLimitsData {
  usage: UsageLimit | null
  remainingTokens: number
  usagePercentage: number
  hasExceeded: boolean
  formattedUsage: string
  formattedLimit: string
  formattedRemaining: string
  resetDate: Date
  avatarsGenerated: number
  avatarsLimit: number
  avatarsRemaining: number
}

export function useTokenLimits(userId: string | undefined) {
  const [data, setData] = useState<TokenLimitsData>({
    usage: null,
    remainingTokens: 250_000,
    usagePercentage: 0,
    hasExceeded: false,
    formattedUsage: '0',
    formattedLimit: '250K',
    formattedRemaining: '250K',
    resetDate: getNextResetDate(),
    avatarsGenerated: 0,
    avatarsLimit: 5,
    avatarsRemaining: 5
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Get current usage for the current period
      const { data: usage, error: usageError } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', userId)
        .gte('period_end', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (usageError) {
        // PGRST116 is "no rows returned", which is expected for new users
        if (usageError.code !== 'PGRST116') {
          console.error('Supabase usage query error:', {
            code: usageError.code,
            message: usageError.message,
            details: usageError.details,
            hint: usageError.hint,
            userId
          })
          throw usageError
        }
      }

      if (!usage) {
        // No current usage period found - show default free tier
        // The usage_limits record will be created automatically when user first chats
        console.log('ℹ️ No usage_limits found for user (will be created on first chat)')
        setData({
          usage: null,
          remainingTokens: 250_000,
          usagePercentage: 0,
          hasExceeded: false,
          formattedUsage: '0',
          formattedLimit: '250K',
          formattedRemaining: '250K',
          resetDate: getNextResetDate(),
          avatarsGenerated: 0,
          avatarsLimit: 5,
          avatarsRemaining: 5
        })
        setIsLoading(false)
        return
      }
      
      console.log('✅ Fetched usage_limits:', usage)

      // Supabase returns snake_case columns; map to camelCase to match our schema types
      const mappedUsage: UsageLimit = {
        // @ts-ignore - Supabase row uses snake_case
        id: usage.id,
        // @ts-ignore
        userId: usage.user_id,
        // @ts-ignore
        messageCount: usage.message_count ?? 0,
        // @ts-ignore
        agentCount: usage.agent_count ?? 0,
        // @ts-ignore
        tokensUsed: usage.tokens_used ?? 0,
        // @ts-ignore
        tokensLimit: usage.tokens_limit ?? 250_000,
        // @ts-ignore
        planType: usage.plan_type ?? 'free',
        // @ts-ignore
        avatarsGenerated: usage.avatars_generated ?? 0,
        // @ts-ignore
        avatarsLimit: usage.avatars_limit ?? 5,
        // @ts-ignore
        periodStart: new Date(usage.period_start),
        // @ts-ignore
        periodEnd: new Date(usage.period_end),
        // @ts-ignore
        createdAt: new Date(usage.created_at)
      }

      // Calculate derived values using mapped camelCase fields
      const remainingTokens = calculateRemainingTokens(mappedUsage.tokensUsed, mappedUsage.tokensLimit)
      const usagePercentage = calculateUsagePercentage(mappedUsage.tokensUsed, mappedUsage.tokensLimit)
      const hasExceeded = hasExceededTokenLimit(mappedUsage.tokensUsed, mappedUsage.tokensLimit)
      const avatarsGenerated = mappedUsage.avatarsGenerated ?? 0
      const avatarsLimit = mappedUsage.avatarsLimit ?? 5
      const avatarsRemaining = Math.max(0, avatarsLimit - avatarsGenerated)

      setData({
        usage: mappedUsage,
        remainingTokens,
        usagePercentage,
        hasExceeded,
        formattedUsage: formatTokenCount(mappedUsage.tokensUsed),
        formattedLimit: formatTokenCount(mappedUsage.tokensLimit),
        formattedRemaining: formatTokenCount(remainingTokens),
        resetDate: new Date(mappedUsage.periodEnd),
        avatarsGenerated,
        avatarsLimit,
        avatarsRemaining
      })

    } catch (err) {
      console.error('Error fetching token usage:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        userId
      })
      setError(err instanceof Error ? err.message : 'Failed to fetch token usage')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Initialize or create usage limits for a user
  const initializeUsageLimits = useCallback(async (planType: string = 'free') => {
    if (!userId) return

    try {
      const supabase = createClient()
      
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
             const tokensLimit = planType === 'pro' ? 10_000_000 : 250_000

      const avatarsLimit = planType === 'pro' ? 50 : 5

      const { data, error } = await supabase
        .from('usage_limits')
        .insert({
          user_id: userId,
          message_count: 0,
          agent_count: 0,
          tokens_used: 0,
          tokens_limit: tokensLimit,
          plan_type: planType,
          avatars_generated: 0,
          avatars_limit: avatarsLimit,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Refresh the data
      await fetchUsage()
      
      return data
    } catch (err) {
      console.error('Error initializing usage limits:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize usage limits')
    }
  }, [userId, fetchUsage])

  // Refresh usage data and notify all components
  const refreshUsage = useCallback(async () => {
    console.log('🔄 Refreshing token usage and notifying all components...')
    await fetchUsage()
    // Dispatch event to notify other components using this hook
    window.dispatchEvent(new Event('tokenUsageUpdated'))
    console.log('✅ Token usage refresh complete and event dispatched')
  }, [fetchUsage])

  // Check if user can perform an action (based on estimated token cost)
  const canPerformAction = useCallback((estimatedTokenCost: number = 0) => {
    if (!data.usage) return true // Allow if no limits set yet
    return data.remainingTokens >= estimatedTokenCost
  }, [data.remainingTokens, data.usage])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  // Listen for token usage updates from other components
  useEffect(() => {
    const handleTokenUpdate = () => {
      console.log('🔔 Token update event received, refreshing...')
      fetchUsage()
    }

    window.addEventListener('tokenUsageUpdated', handleTokenUpdate)
    return () => window.removeEventListener('tokenUsageUpdated', handleTokenUpdate)
  }, [fetchUsage])

  return {
    ...data,
    isLoading,
    error,
    initializeUsageLimits,
    refreshUsage,
    canPerformAction
  }
} 