// Token counting utilities for different AI models

/**
 * Model cost multipliers - how many tokens to charge users based on model
 * This reflects both API costs and quality tiers
 */
export const MODEL_TOKEN_MULTIPLIERS: Record<string, number> = {
  // OpenAI Models
  'gpt-4o-mini': 1.0,      // Base rate - most efficient
  'gpt-4o': 3.0,           // 3x tokens - premium quality, higher API cost
  
  // Anthropic Models  
  'claude-3.5-sonnet': 2.0,  // 2x tokens - good balance
  'claude-3.7-sonnet': 2.5,  // 2.5x tokens - latest, highest quality
}

/**
 * Estimates the number of tokens for a given text and model
 * This is an approximation since exact token counting requires model-specific tokenizers
 */
export function estimateTokens(text: string, model: string): number {
  if (!text || text.trim().length === 0) {
    return 0
  }

  // Basic estimation: ~4 characters per token for most models
  const baseTokens = Math.ceil(text.length / 4)
  
  // Apply model cost multiplier (charges user more tokens for premium models)
  const multiplier = MODEL_TOKEN_MULTIPLIERS[model] || 1.0
  
  return Math.ceil(baseTokens * multiplier)
}

/**
 * Gets the display name and description for a model
 */
export function getModelInfo(model: string): { name: string; description: string; costMultiplier: number } {
  const info: Record<string, { name: string; description: string }> = {
    'gpt-4o-mini': { name: 'GPT-4o Mini', description: 'Fast & efficient - Best value' },
    'gpt-4o': { name: 'GPT-4o', description: 'Premium quality - 3x tokens' },
    'claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', description: 'Balanced - 2x tokens' },
    'claude-3.7-sonnet': { name: 'Claude 3.7 Sonnet', description: 'Latest & best - 2.5x tokens' },
  }
  
  return {
    ...info[model] || { name: model, description: 'Unknown model' },
    costMultiplier: MODEL_TOKEN_MULTIPLIERS[model] || 1.0
  }
}

/**
 * Avatar generation costs and limits
 */
export const AVATAR_GENERATION_COST = 10_000 // 10K tokens per avatar (profitable)

export function getAvatarLimitForPlan(planType: string): number {
  switch (planType.toLowerCase()) {
    case 'pro':
      return 50 // 50 AI avatars per month for Pro
    case 'free':
    default:
      return 5  // 5 AI avatars per month for Free
  }
}

/**
 * Gets the token limit for a specific plan type
 */
export function getTokenLimitForPlan(planType: string): number {
  switch (planType.toLowerCase()) {
    case 'pro':
      return 10_000_000 // 10M tokens for Pro users
    case 'free':
    default:
      return 250_000    // 250K tokens for free users (with 5 credit limit)
  }
}



/**
 * Calculates remaining tokens for a user
 */
export function calculateRemainingTokens(tokensUsed: number, tokensLimit: number): number {
  return Math.max(0, tokensLimit - tokensUsed)
}

/**
 * Calculates usage percentage
 */
export function calculateUsagePercentage(tokensUsed: number, tokensLimit: number): number {
  if (tokensLimit === 0) return 0
  return Math.min(100, (tokensUsed / tokensLimit) * 100)
}

/**
 * Checks if user has exceeded their token limit
 */
export function hasExceededTokenLimit(tokensUsed: number, tokensLimit: number): boolean {
  return tokensUsed >= tokensLimit
}

/**
 * Formats token count for display (e.g., 1.5M, 2.3K)
 */
export function formatTokenCount(tokens: number): string {
  if (typeof tokens !== 'number' || Number.isNaN(tokens)) {
    return '0'
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

/**
 * Gets the reset date for monthly limits (first day of next month)
 */
export function getNextResetDate(): Date {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth
}

/**
 * Creates a new monthly usage period
 */
export function createNewUsagePeriod(planType: string = 'free') {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  
  return {
    periodStart,
    periodEnd,
    tokensLimit: getTokenLimitForPlan(planType),
    tokensUsed: 0,
    messageCount: 0,
    agentCount: 0,
    planType
  }
}

 