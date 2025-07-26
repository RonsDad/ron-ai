import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json()
    const { sessionId } = params
    
    // Proxy request to Python backend browser-use service
    const response = await fetch(`http://localhost:8000/browser-use/session/${sessionId}/navigate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error navigating browser-use session:', error)
    return NextResponse.json(
      { error: 'Failed to navigate browser-use session' },
      { status: 500 }
    )
  }
}