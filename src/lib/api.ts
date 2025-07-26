// API service for communicating with Claude agent backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  system_prompt?: string
  temperature?: number
  max_tokens?: number
  tools?: string[]
  enable_caching?: boolean
  cache_ttl?: string
  enable_thinking?: boolean
  thinking_budget?: number
  enable_citations?: boolean
  stream?: boolean
}

export interface ChatResponse {
  success: boolean
  response: {
    content: Array<{
      type: string
      text?: string
      tool_use?: {
        id: string
        name: string
        input: any
      }
    }>
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  error?: string
}

export class ClaudeAPI {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async chatStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, stream: true }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    return response.body
  }

  async healthcareAnalyze(task: string, context?: any) {
    const response = await fetch(`${this.baseURL}/healthcare/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, context }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async deepResearch(messages: ChatMessage[], sessionId: string, userId: string) {
    const response = await fetch(`${this.baseURL}/api/run_sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        userId,
        newMessage: {
          parts: messages.map(msg => ({ text: msg.content })),
          role: messages[messages.length - 1].role
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.body
  }
}

// Export singleton instance
export const claudeAPI = new ClaudeAPI()

// Helper function to parse SSE stream
export async function* parseSSEStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data && data !== '[DONE]') {
            try {
              yield JSON.parse(data)
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
} 