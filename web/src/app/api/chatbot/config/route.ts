import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const ChatbotConfigSchema = z.object({
  welcomeMessage: z.string().max(1000).optional(),
  businessHours: z.string().max(500).optional(),
  aiPersonality: z.string().max(500).optional(),
  attendanceEnabled: z.boolean().optional(),
  schedulingEnabled: z.boolean().optional(),
  salesEnabled: z.boolean().optional(),
  autoReply: z.boolean().optional(),
  humanHandoffMessage: z.string().max(1000).optional(),
  knowledgeBase: z.string().max(10000).optional(),
  plans: z.array(z.unknown()).optional(),
})

/**
 * GET /api/chatbot/config
 * Returns the chatbot configuration for the authenticated org
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

  const org = profile.organization
  const config = (org.chatbotConfig as Record<string, unknown>) || {}

  return NextResponse.json({
    chatbotEnabled: org.chatbotEnabled,
    welcomeMessage: (config.welcomeMessage as string) || '',
    businessHours: (config.businessHours as string) || '',
    aiPersonality: (config.aiPersonality as string) || 'amigavel e profissional',
    attendanceEnabled: (config.attendanceEnabled as boolean) ?? true,
    schedulingEnabled: (config.schedulingEnabled as boolean) ?? true,
    salesEnabled: (config.salesEnabled as boolean) ?? false,
    autoReply: (config.autoReply as boolean) ?? true,
    humanHandoffMessage: (config.humanHandoffMessage as string) || '',
    knowledgeBase: (config.knowledgeBase as string) || '',
    plans: (config.plans as unknown[]) || [],
  })
}

/**
 * POST /api/chatbot/config
 * Saves the chatbot configuration for the authenticated org
 * HIGH FIX: Requires ADMIN or TRAINER role — STUDENT must not be able to edit chatbot settings
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

  // HIGH FIX: Only admins and trainers may update chatbot configuration
  if (profile.role === 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rawBody = await request.json()
  const parsedBody = ChatbotConfigSchema.safeParse(rawBody)
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 422 })
  }
  const body = parsedBody.data

  // MED-02: Enforce knowledgeBase size limit
  if (body.knowledgeBase && body.knowledgeBase.length > 10000) {
    return NextResponse.json({ error: 'knowledgeBase must not exceed 10000 characters' }, { status: 422 })
  }

  const {
    welcomeMessage,
    businessHours,
    aiPersonality,
    attendanceEnabled,
    schedulingEnabled,
    salesEnabled,
    autoReply,
    humanHandoffMessage,
    knowledgeBase,
    plans,
  } = body

  // Merge with existing config to preserve other fields (e.g., wellhub, totalpass)
  const existingConfig = (profile.organization.chatbotConfig as Record<string, unknown>) || {}

  const newConfig = {
    ...existingConfig,
    welcomeMessage: welcomeMessage ?? existingConfig.welcomeMessage,
    businessHours: businessHours ?? existingConfig.businessHours,
    aiPersonality: aiPersonality ?? existingConfig.aiPersonality,
    attendanceEnabled: attendanceEnabled ?? existingConfig.attendanceEnabled,
    schedulingEnabled: schedulingEnabled ?? existingConfig.schedulingEnabled,
    salesEnabled: salesEnabled ?? existingConfig.salesEnabled,
    autoReply: autoReply ?? existingConfig.autoReply,
    humanHandoffMessage: humanHandoffMessage ?? existingConfig.humanHandoffMessage,
    knowledgeBase: knowledgeBase ?? existingConfig.knowledgeBase,
    plans: plans ?? existingConfig.plans,
  }

  // Enable chatbot if at least one mode is active
  const chatbotEnabled = !!(
    (newConfig.attendanceEnabled) ||
    (newConfig.schedulingEnabled) ||
    (newConfig.salesEnabled)
  )

  await prisma.organization.update({
    where: { id: profile.organization.id },
    data: {
      chatbotConfig: newConfig,
      chatbotEnabled,
    },
  })

  return NextResponse.json({ success: true, chatbotEnabled })
}
