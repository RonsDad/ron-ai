"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Monitor, Maximize2, Minimize2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ComputerUseAgentProps {
  isVisible: boolean
  onClose: () => void
  task?: string
  liveUrl?: string
  isMobile?: boolean
  isLoading?: boolean
  error?: string | null
}

export function ComputerUseAgent({
  isVisible,
  onClose,
  task = "Computer Use Agent Active",
  liveUrl,
  isMobile = false,
  isLoading = false,
  error = null,
}: ComputerUseAgentProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            opacity: 0,
            y: isMobile ? -20 : 20,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: isMobile ? -20 : 20,
            scale: 0.95,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300,
          }}
          className={`
            fixed z-30
            ${
              isMobile
                ? "inset-0"
                : isMaximized
                  ? "inset-0"
                  : "top-4 right-4 bottom-4 left-[50%]"
            }
          `}
        >
          <div className="h-full w-full flex flex-col bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Ron's Browser Window</h3>
                  {liveUrl && <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[300px]">{liveUrl}</p>}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!isMobile && (
                  <Button variant="ghost" size="icon" onClick={toggleMaximize} className="w-8 h-8 hover:bg-gray-200 dark:hover:bg-gray-800">
                    {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-gray-200 dark:hover:bg-gray-800">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-8 h-8 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Browser Content - NO PADDING */}
            <div className="flex-1 bg-white dark:bg-black">
              {liveUrl ? (
                <iframe
                  src={liveUrl}
                  className="w-full h-full border-0"
                  title="Computer Use Agent Browser"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
                  <div className="text-center">
                    <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Computer Use Agent Active</p>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-500">{task}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Status: Active</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-gray-600 dark:text-gray-400">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
