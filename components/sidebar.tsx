"use client"

import { motion } from "framer-motion"
import { Sparkles, Globe, MessageCircle, Grid3X3 } from "lucide-react"
import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "create", label: "Create Agent", icon: Sparkles },
    { id: "browse", label: "Browse Agent", icon: Globe },
    { id: "chat", label: "Chat Agent", icon: MessageCircle },
  ]

  

  
  return (
    <div className="hidden md:flex w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col">
      {/* Header with EQUILINK Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
            <Grid3X3 className="w-4 h-4 text-white dark:text-black" />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white">EQUILINK</span>
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
                    ? "bg-yellow-400 text-black font-medium"
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

     
    </div>
  )
}
