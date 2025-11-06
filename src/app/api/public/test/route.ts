export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { regionHeader } from '@/lib/route-config'

export async function GET() {
  return NextResponse.json({ 
    message: 'Public API is working!',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return NextResponse.json({ 
      message: 'POST request received',
      data: body,
      timestamp: new Date().toISOString()
    }, { headers: regionHeader() })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Invalid JSON',
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }
}
