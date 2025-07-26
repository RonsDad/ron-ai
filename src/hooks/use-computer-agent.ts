"use client"

import { useState } from "react"

interface ComputerAgentState {
  isActive: boolean
  currentTask: string | null
  liveUrl: string | null
  sessionId: string | null
}

export function useComputerAgent() {
  const [agentState, setAgentState] = useState<ComputerAgentState>({
    isActive: false,
    currentTask: null,
    liveUrl: null,
    sessionId: null,
  })

  const startAgent = async (task: string, url?: string) => {
    try {
      // Call browser-use backend to create session with LiveURL
      const response = await fetch('/api/browser-use/session/create-with-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: url || 'https://duckduckgo.com', 
          timeout_ms: 600000 
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create browser session: ${response.status}`)
      }
      
      const data = await response.json()
      const sessionId = data.result.session_id
      const liveUrl = data.result.live_url
      
      setAgentState({
        isActive: true,
        currentTask: task,
        liveUrl: liveUrl,
        sessionId: sessionId,
      })

      // Now execute the task on the browser-use agent
      if (task && task !== "Computer Use Agent Active") {
        console.log(`Executing browser task: ${task}`)
        
        try {
          const taskResponse = await fetch(`/api/browser-use/session/${sessionId}/task`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task })
          })
          
          if (!taskResponse.ok) {
            console.error(`Failed to execute task: ${taskResponse.status}`)
          } else {
            const taskResult = await taskResponse.json()
            console.log('Task execution result:', taskResult)
          }
        } catch (taskError) {
          console.error('Error executing browser task:', taskError)
        }
      }
      
    } catch (error) {
      console.error('Failed to start browser agent:', error)
      // Fallback to just showing UI without LiveURL
      const sessionId = `cua_${Date.now()}`
      setAgentState({
        isActive: true,
        currentTask: task,
        liveUrl: null,
        sessionId,
      })
    }
  }

  const stopAgent = async () => {
    if (agentState.sessionId) {
      try {
        // Close browser session
        await fetch(`/api/browser-use/session/${agentState.sessionId}/close`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.error('Failed to close browser session:', error)
      }
    }
    
    setAgentState({
      isActive: false,
      currentTask: null,
      liveUrl: null,
      sessionId: null,
    })
  }

  const updateTask = (task: string) => {
    setAgentState((prev) => ({
      ...prev,
      currentTask: task,
    }))
  }

  const updateUrl = (url: string) => {
    setAgentState((prev) => ({
      ...prev,
      liveUrl: url,
    }))
  }

  const executeTask = async (task: string) => {
    if (!agentState.sessionId) {
      throw new Error('No active browser session')
    }

    try {
      const taskResponse = await fetch(`/api/browser-use/session/${agentState.sessionId}/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task })
      })
      
      if (!taskResponse.ok) {
        throw new Error(`Failed to execute task: ${taskResponse.status}`)
      }
      
      const taskResult = await taskResponse.json()
      console.log('Task execution result:', taskResult)
      
      // Update current task
      setAgentState((prev) => ({
        ...prev,
        currentTask: task,
      }))
      
      return taskResult
    } catch (error) {
      console.error('Error executing browser task:', error)
      throw error
    }
  }

  return {
    agentState,
    startAgent,
    stopAgent,
    updateTask,
    updateUrl,
    executeTask,
  }
}
