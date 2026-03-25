import { NextRequest, NextResponse } from 'next/server'
import { claudeClient } from '@/chatbot-engine/integrations/claude'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/chatbot/test
 * Test the chatbot with a simulated message (no WhatsApp needed)
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { organization: { include: { services: { where: { isActive: true } } } } },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const {
    message,
    mode = 'ATTENDANCE',
    history = [],
  } = await request.json() as {
    message: string
    mode?: 'ATTENDANCE' | 'SCHEDULING' | 'SALES'
    history?: Array<{ role: 'user' | 'bot'; content: string }>
  }

  const org = profile.organization
  const config = (org.chatbotConfig as Record<string, unknown>) || {}

  const contextData: Record<string, string> = {
    businessData: [
      `Nome: ${org.name}`,
      config.businessHours ? `Horario: ${config.businessHours}` : '',
      org.phone ? `Telefone: ${org.phone}` : '',
    ].filter(Boolean).join('\n'),
    services: org.services.map((s: { name: string; description?: string | null; durationMinutes: number; price: number | { toString(): string } }) =>
      `- ${s.name}: ${s.description || ''} | ${s.durationMinutes}min | R$ ${s.price}`
    ).join('\n') || 'Nenhum servico',
    plans: config.plans ? JSON.stringify(config.plans) : 'Nenhum plano',
    availableSlots: 'Horarios disponiveis: 08:00, 09:00, 10:00, 14:00, 15:00, 16:00, 18:00',
  }

  // Build message history for Claude: convert bot history to assistant role
  const previousMessages: Array<{ role: 'user' | 'assistant'; content: string }> = history.map(
    (h) => ({
      role: h.role === 'bot' ? 'assistant' : 'user',
      content: h.content,
    })
  )

  // Append the current message
  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...previousMessages,
    { role: 'user', content: message },
  ]

  const response = await claudeClient.chat(
    mode as 'ATTENDANCE' | 'SCHEDULING' | 'SALES',
    claudeMessages,
    contextData
  )

  const { displayMessage, action } = claudeClient.parseResponse(response.content)

  return NextResponse.json({
    response: displayMessage,
    action: action?.type || null,
    tokensUsed: response.tokensUsed,
    model: response.model,
  })
}
