"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Menu, Sparkles, Globe, MessageCircle, Grid3X3, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

interface MobileSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function MobileSidebar({ activeTab, setActiveTab }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  const menuItems = [
    { id: "create", label: "Create Agent", icon: Sparkles },
    { id: "browse", label: "Browse Agent", icon: Globe },
    { id: "chat", label: "Chat Agent", icon: MessageCircle },
  ]

  const handleItemClick = (tabId: string) => {
    setActiveTab(tabId)
    setOpen(false)
  }


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
     
          <SheetTitle className="hidden">Navigation Menu</SheetTitle>
      
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
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
                    onClick={() => handleItemClick(item.id)}
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

          {/* Theme Toggle */}
          <div className="p-4">
          
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
