import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Proxy request to Python backend browser-use service
    const response = await fetch('http://localhost:8000/browser-use/session/create-with-url', {
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
    console.error('Error creating browser-use session with URL:', error)
    return NextResponse.json(
      { error: 'Failed to create browser-use session with URL' },
      { status: 500 }
    )
  }
}