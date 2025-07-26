"use client"

import { useState } from "react"
import { Bot } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import BrowserUseIframe from "@/components/browser-use-iframe"
import { RetractableSidebar } from "@/components/retractable-sidebar"

export default function BrowserPage() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <RetractableSidebar onOpenChange={setIsOpen} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-out bg-background h-screen ${isOpen ? "ml-80" : "ml-0"}`}>
        <header className="sticky top-0 z-10 flex items-center justify-between py-4 px-6 pl-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Ron AI - Browser Interface</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Interactive Browser Sessions</h2>
              <p className="text-muted-foreground">
                Create live browser sessions that you can interact with directly. Perfect for research, 
                form filling, or any web-based tasks that require human interaction.
              </p>
            </div>
            
            <BrowserUseIframe 
              defaultUrl="https://google.com"
              onSessionCreated={(session) => {
                console.log('Browser session created:', session)
              }}
              onSessionClosed={(sessionId) => {
                console.log('Browser session closed:', sessionId)
              }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}