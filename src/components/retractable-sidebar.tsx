"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, Pill, Users, Shield, FileText, Wrench, Settings, User, HelpCircle, ChevronRight, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface RetractableSidebarProps {
  onOpenChange: (open: boolean) => void
}

export function RetractableSidebar({ onOpenChange }: RetractableSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleSidebar = () => {
    const newState = !isOpen
    setIsOpen(newState)
    onOpenChange(newState)
  }

  const closeSidebar = () => {
    setIsOpen(false)
    onOpenChange(false)
  }

  const navigationItems = [
    {
      title: "My Care Team",
      icon: Users,
      href: "/care-team",
      description: "Manage your healthcare providers",
    },
    {
      title: "My Benefits",
      icon: Shield,
      href: "/benefits",
      description: "Insurance and coverage details",
    },
    {
      title: "My Treatments",
      icon: Pill,
      href: "/treatments",
      description: "Medications and treatment plans",
    },
    {
      title: "My History",
      icon: FileText,
      href: "/history",
      description: "Medical records and appointments",
    },
    {
      title: "My Toolbox",
      icon: Wrench,
      href: "/toolbox",
      description: "Health management tools",
    },
    {
      title: "Browser Interface",
      icon: Globe,
      href: "/browser",
      description: "Interactive browser sessions",
    },
  ]

  const bottomItems = [
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
    },
    {
      title: "Account",
      icon: User,
      href: "/account",
    },
    {
      title: "Support",
      icon: HelpCircle,
      href: "/support",
    },
  ]

  if (!mounted) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/50"
        >
          <div className="w-5 h-5" />
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card/90 transition-all duration-200"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={closeSidebar}
            />

            {/* Sidebar Content */}
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-80 z-50"
            >
              <Card className="h-full rounded-none rounded-r-2xl bg-card/95 backdrop-blur-xl border-r border-border/50 shadow-2xl">
                {/* Header with Close Button */}
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">R</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold font-inter">Ron AI</h2>
                        <p className="text-sm text-muted-foreground">Health Co-Pilot</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={closeSidebar}
                      className="w-8 h-8 hover:bg-muted/50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-6 space-y-2">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className="w-full justify-start h-16 p-4 rounded-xl hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all duration-300 group"
                      onClick={closeSidebar}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className="w-10 h-10 rounded-lg bg-muted/30 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-300 flex-shrink-0">
                          <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-semibold text-base text-foreground group-hover:text-primary transition-colors duration-300 truncate font-inter">
                            {item.title}
                          </div>
                          <div className="text-sm text-muted-foreground font-medium truncate font-inter">
                            {item.description}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                      </div>
                    </Button>
                  ))}
                </nav>

                {/* Bottom Section */}
                <div className="p-6 pt-0 border-t border-border/20 space-y-2">
                  {bottomItems.map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className="w-full justify-start h-12 rounded-xl hover:bg-muted/50 hover:border-border/50 border border-transparent transition-all duration-300 group"
                      onClick={closeSidebar}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
                        <span className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300 font-inter">
                          {item.title}
                        </span>
                      </div>
                    </Button>
                  ))}

                  {/* Version Info */}
                  <div className="pt-4 mt-4 border-t border-border/10">
                    <p className="text-xs text-muted-foreground/70 text-center font-medium font-inter">Ron AI v2.1.0</p>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/5 to-transparent rounded-tr-full" />
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
