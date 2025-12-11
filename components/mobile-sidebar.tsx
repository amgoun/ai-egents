"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Menu, Sparkles, Globe, MessageCircle, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import Image from "next/image"
import Logo from "@/public/logo.svg"

interface MobileSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function MobileSidebar({ activeTab, setActiveTab }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/b312a5f6-32be-4c70-ab25-adabf357af97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mobile-sidebar.tsx:17',message:'MobileSidebar mounted',data:{activeTab,open},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  }, []);
  // #endregion

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
      
        <div className="flex flex-col h-full bg-white dark:bg-[#1A1A1A]">
          {/* Header with FlowBrain Logo */}
          <div className="p-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center">
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
                    onClick={() => handleItemClick(item.id)}
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

          {/* Theme Toggle */}
          <div className="p-4">
          
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
