"use client"

import { motion } from "framer-motion"
import { Sparkles, Globe, MessageCircle, Grid3X3, Crown, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useTokenLimits } from "@/hooks/use-token-limits"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

import Logo from "@/public/logo.svg"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>(undefined)
  
  // Get user ID from Supabase auth
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id)
    }
    getUser()
  }, [])

  // Use the token limits hook
  const { 
    formattedUsage, 
    formattedLimit, 
    usagePercentage, 
    hasExceeded,
    resetDate,
    usage,
    isLoading,
    error 
  } = useTokenLimits(userId)

  const menuItems = [
    { id: "create", label: "Create Agent", icon: Sparkles },
    { id: "browse", label: "Browse Agent", icon: Globe },
    { id: "chat", label: "Chat Agent", icon: MessageCircle },
  ]

  const handleUpgrade = async () => {
    if (!userId) {
      router.push('/login')
      return
    }

    try {
      console.log('Starting LemonSqueezy checkout...')
      
      const response = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to create checkout')
      }
      
      const { checkoutUrl } = await response.json()
      
      // Redirect to LemonSqueezy checkout
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Upgrade error:', error)
      // You can add a toast notification here if you have one
      alert('Failed to start checkout. Please try again.')
    }
  }

  return (
    <div className="hidden md:flex w-64 bg-white dark:bg-[#1A1A1A] flex-col ">
      {/* Header with EQUILINK Logo */}
      <div className="p-6 py-5 ">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8  flex items-center justify-center">
            <Image src={Logo} alt="FlowBrain" width={32} height={32} />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white uppercase">FlowBrain</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* Token Usage Card and Upgrade Section */}
      <div className="p-4">
        <Card className={`p-4 bg-gradient-to-br border-purple-200 dark:border-purple-700 ${
          hasExceeded 
            ? 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20' 
            : 'from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'
        }`}>
          {/* Token Usage Display */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${hasExceeded ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {usage?.planType === 'pro' ? 'Pro Tokens' : 'Tokens'}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-lg font-bold ${hasExceeded ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
                  {isLoading ? '...' : formattedUsage}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  /{formattedLimit}
                </span>
              </div>
            </div>
            
            {/* Token Progress Bar */}
            <Progress 
              value={isLoading ? 0 : usagePercentage} 
              className={`h-2 ${hasExceeded ? 'bg-red-100 dark:bg-red-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}
            />
            
            {/* Reset Date */}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {hasExceeded ? (
                <span className="text-red-600 dark:text-red-400 font-medium">Token limit exceeded</span>
              ) : (
                <span>Resets {resetDate.toLocaleDateString()}</span>
              )}
            </div>
          </div>
          
          {/* Upgrade Button - Show if free plan or exceeded */}
          {(usage?.planType !== 'pro' || hasExceeded) && (
            <>
              <Button 
                onClick={handleUpgrade}
                className={`w-full font-medium py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  hasExceeded 
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                }`}
              >
                <Crown className="w-4 h-4" />
                {hasExceeded ? 'Upgrade Now' : 'Upgrade to Pro'}
              </Button>
              
              {/* Pro Benefits Text */}
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 text-center">
                <p className="font-medium">10M Tokens + Unlimited Agents</p>
                <p className="text-purple-600 dark:text-purple-400 font-semibold">$30/month</p>
              </div>
            </>
          )}
          
          {/* Pro Plan Status */}
          {usage?.planType === 'pro' && !hasExceeded && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                <Crown className="w-4 h-4" />
                Pro Plan Active
              </div>
                             <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                 10M tokens + unlimited agents
               </div>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 text-center mt-2">
              Unable to load usage data
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
