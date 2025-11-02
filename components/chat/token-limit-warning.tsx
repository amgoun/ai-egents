"use client"

import { AlertTriangle, Crown, Zap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useTokenLimits } from "@/hooks/use-token-limits"

interface TokenLimitWarningProps {
  userId: string | undefined
  onUpgrade?: () => void
}

export default function TokenLimitWarning({ userId, onUpgrade }: TokenLimitWarningProps) {
  const { 
    usage, 
    usagePercentage, 
    hasExceeded, 
    formattedUsage, 
    formattedLimit, 
    formattedRemaining,
    isLoading 
  } = useTokenLimits(userId)

  // Don't show anything if loading or no usage data
  if (isLoading || !usage) {
    return null
  }

  // Show warning at 80% usage
  const showWarning = usagePercentage >= 80 && !hasExceeded
  const showBlock = hasExceeded

  if (!showWarning && !showBlock) {
    return null
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      // Default upgrade action
      console.log('Upgrade to Pro clicked')
      // You can add your upgrade logic here
    }
  }

  if (showBlock) {
    return (
      <div className="mb-4">
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <div className="space-y-3">
              <div>
                <p className="font-semibold">Token Limit Exceeded</p>
                <p className="text-sm">
                  You've used all {formattedLimit} tokens for this month. 
                  {usage.planType === 'free' ? ' Upgrade to Pro for 10M tokens/month!' : ' Please wait for your limit to reset.'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage: {formattedUsage}/{formattedLimit}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">100%</span>
                </div>
                <Progress value={100} className="h-2 bg-red-100 dark:bg-red-900/30" />
              </div>

              {usage.planType === 'free' && (
                <Button 
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro - 10M Tokens/Month
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (showWarning) {
    return (
      <div className="mb-4">
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <div className="space-y-3">
              <div>
                <p className="font-semibold">Token Usage Warning</p>
                <p className="text-sm">
                  You're running low on tokens. {formattedRemaining} remaining this month.
                  {usage.planType === 'free' && ' Consider upgrading to Pro for 10x more tokens!'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage: {formattedUsage}/{formattedLimit}</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    {usagePercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={usagePercentage} 
                  className="h-2 bg-yellow-100 dark:bg-yellow-900/30" 
                />
              </div>

              {usage.planType === 'free' && (
                <Button 
                  onClick={handleUpgrade}
                  variant="outline"
                  size="sm"
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return null
} 