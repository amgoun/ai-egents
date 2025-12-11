"use client"

import { motion } from "framer-motion"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import MobileSidebar from "./mobile-sidebar"
//import { LogoutButton } from "./auth-button"
import  LogoutButton from "@/components/auth-button"
import { useEffect, useState } from "react"

interface TopNavbarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function TopNavbar({ activeTab, setActiveTab }: TopNavbarProps) {
  const [isDark, setIsDark] = useState(false)
  
  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
  
    if (newTheme) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  useEffect(() => {
    const theme = localStorage.getItem("theme")
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (theme === "dark" || (!theme && systemPrefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  return (
    <nav className="bg-white dark:bg-[#1A1A1A] shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Mobile Menu */}
        <div className="flex items-center">
          <MobileSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Right side - Theme Toggle + Auth */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <div>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full p-1 w-fit">
              <motion.button
                onClick={toggleTheme}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  !isDark ? "bg-blue-600/20 text-black" : "text-gray-600 dark:text-gray-400"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sun className="w-4 h-4" />
              </motion.button>

              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 px-2">{isDark ? "Dark" : "Light"}</span>

              <motion.button
                onClick={toggleTheme}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isDark ? "bg-gray-600 text-white" : "text-gray-600"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Moon className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Auth Button */}
          <LogoutButton />
        </div>
      </div>
    </nav>
  )
}
