import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Proxy request to Python backend
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    // Handle streaming response
    if (body.stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }
    
    // Handle regular response
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error calling Claude API:', error)
    return NextResponse.json(
      { error: 'Failed to call Claude API' },
      { status: 500 }
    )
  }
}