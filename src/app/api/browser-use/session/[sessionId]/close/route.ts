import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params
    
    // Proxy request to Python backend browser-use service
    const response = await fetch(`http://localhost:8000/browser-use/session/${sessionId}/close`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error closing browser-use session:', error)
    return NextResponse.json(
      { error: 'Failed to close browser-use session' },
      { status: 500 }
    )
  }
}