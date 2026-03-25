import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

interface WellhubConfig {
  enabled: boolean
  partnerId: string
  secretKey: string
}

interface TotalpassConfig {
  enabled: boolean
  apiKey: string
  integrationCode: string
  mode: 'checkin_only' | 'booking_and_checkin'
}

/**
 * GET /api/admin/integrations
 * Returns wellhub and totalpass config from org.chatbotConfig
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { organization: true },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const config = (profile.organization.chatbotConfig as Record<string, unknown>) || {}

  return NextResponse.json({
    wellhub: (config.wellhub as WellhubConfig) || {
      enabled: false,
      partnerId: '',
      secretKey: '',
    },
    totalpass: (config.totalpass as TotalpassConfig) || {
      enabled: false,
      apiKey: '',
      integrationCode: '',
      mode: 'checkin_only',
    },
  })
}

/**
 * POST /api/admin/integrations
 * Saves wellhub and/or totalpass config to org.chatbotConfig
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { organization: true },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json() as {
    wellhub?: WellhubConfig
    totalpass?: TotalpassConfig
  }

  const existingConfig = (profile.organization.chatbotConfig as Record<string, unknown>) || {}

  const newConfig = {
    ...existingConfig,
    ...(body.wellhub !== undefined && { wellhub: body.wellhub }),
    ...(body.totalpass !== undefined && { totalpass: body.totalpass }),
  }

  await prisma.organization.update({
    where: { id: profile.organization.id },
    data: { chatbotConfig: newConfig },
  })

  return NextResponse.json({ success: true })
}
