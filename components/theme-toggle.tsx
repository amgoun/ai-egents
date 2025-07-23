"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem("theme")
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (theme === "dark" || (!theme && systemPrefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

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

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full p-1 border border-gray-200 dark:border-gray-700 shadow-lg">
        <motion.button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors ${
            !isDark ? "bg-yellow-400 text-black" : "text-gray-600 dark:text-gray-400"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sun className="w-4 h-4" />
        </motion.button>

        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 px-1">{isDark ? "Dark" : "Light"}</span>

        <motion.button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors ${isDark ? "bg-gray-700 text-white" : "text-gray-600"}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Moon className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  )
}
