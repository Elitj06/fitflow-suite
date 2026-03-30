import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, orgId: ctx.orgId })
}
