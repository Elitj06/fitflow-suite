/**
 * FitBot AI — Main Orchestrator
 * Handles the complete message processing pipeline:
 * 1. Receive WhatsApp message (webhook)
 * 2. Find or create conversation
 * 3. Determine mode (attendance/scheduling/sales)
 * 4. Call Claude for AI response
 * 5. Execute any actions (booking, sale, etc.)
 * 6. Send response via Evolution API
 */

import { prisma } from '@/lib/prisma'
import { claudeClient, type ChatAction } from './integrations/claude'
import {
  evolutionClient,
  EvolutionClient,
  type WebhookPayload,
} from './integrations/evolution'

type ChatMode = 'ATTENDANCE' | 'SCHEDULING' | 'SALES' | 'HUMAN_HANDOFF'

interface ProcessResult {
  success: boolean
  responseText: string
  action?: ChatAction | null
  error?: string
}

export class FitBotOrchestrator {
  /**
   * Main entry point: process an incoming WhatsApp message
   */
  async processIncomingMessage(
    payload: WebhookPayload,
    orgId: string
  ): Promise<ProcessResult> {
    try {
      // 1. Extract message info
      const messageText = EvolutionClient.extractMessageText(payload)
      const sender = EvolutionClient.extractSenderInfo(payload)

      // Ignore messages from self
      if (sender.isFromMe || !messageText) {
        return { success: true, responseText: '' }
      }

      // 2. Get organization and config
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          services: { where: { isActive: true } },
        },
      })

      if (!org || !org.chatbotEnabled) {
        return { success: false, responseText: '', error: 'Chatbot disabled' }
      }

      // 3. Find or create conversation
      const conversation = await this.getOrCreateConversation(
        orgId,
        sender.phone,
        sender.name
      )

      // 4. Save inbound message
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          orgId,
          direction: 'INBOUND',
          content: messageText,
          messageType: 'TEXT',
        },
      })

      // 5. Build conversation history for Claude
      const recentMessages = await prisma.chatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      const claudeMessages = recentMessages
        .reverse()
        .map((m) => ({
          role: (m.direction === 'INBOUND' ? 'user' : 'assistant') as
            | 'user'
            | 'assistant',
          content: m.content,
        }))

      // 6. Build context data for the AI (now async for real availability)
      const contextData = await this.buildContextData(org, conversation, orgId)

      // 7. Call Claude
      const currentMode = conversation.currentMode as ChatMode
      let aiResponse
      try {
        aiResponse = await claudeClient.chat(
          currentMode === 'HUMAN_HANDOFF' ? 'ATTENDANCE' : currentMode,
          claudeMessages,
          contextData,
          sender.phone
        )
      } catch (err) {
        if (err instanceof Error && err.message === 'RATE_LIMIT_EXCEEDED') {
          const rateLimitMsg = 'Você está enviando muitas mensagens. Aguarde 1 minuto e tente novamente. 🙏'
          if (org.whatsappInstanceId) {
            await evolutionClient.sendText({
              instanceName: org.whatsappInstanceId,
              to: sender.phone,
              text: rateLimitMsg,
            })
          }
          return { success: true, responseText: rateLimitMsg }
        }
        throw err
      }

      // 8. Parse response for actions
      const { displayMessage, action } = claudeClient.parseResponse(
        aiResponse.content
      )

      // 9. Execute any actions
      if (action) {
        await this.executeAction(action, orgId, conversation.id, sender.phone)
      }

      // 10. Save outbound message
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          orgId,
          direction: 'OUTBOUND',
          content: displayMessage,
          messageType: 'TEXT',
          aiGenerated: true,
          aiModel: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
        },
      })

      // 11. Update conversation
      await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          ...(action?.type === 'SWITCH_MODE' && {
            currentMode: action.data.newMode as ChatMode,
          }),
        },
      })

      // 12. Send response via WhatsApp
      if (displayMessage && org.whatsappInstanceId) {
        await evolutionClient.sendText({
          instanceName: org.whatsappInstanceId,
          to: sender.phone,
          text: displayMessage,
        })
      }

      return {
        success: true,
        responseText: displayMessage,
        action,
      }
    } catch (error) {
      console.error('FitBot processing error:', error)
      return {
        success: false,
        responseText: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get or create a conversation for this phone number
   */
  private async getOrCreateConversation(
    orgId: string,
    phone: string,
    contactName: string | null
  ) {
    const existing = await prisma.chatConversation.findUnique({
      where: {
        orgId_whatsappNumber: {
          orgId,
          whatsappNumber: phone,
        },
      },
    })

    if (existing) {
      // Update name if we have it now
      if (contactName && !existing.contactName) {
        await prisma.chatConversation.update({
          where: { id: existing.id },
          data: { contactName },
        })
      }
      return existing
    }

    return prisma.chatConversation.create({
      data: {
        orgId,
        whatsappNumber: phone,
        contactName,
        currentMode: 'ATTENDANCE',
      },
    })
  }

  /**
   * Build real availability string for next 7 days
   */
  private async buildAvailableSlots(orgId: string): Promise<string> {
    try {
      const now = new Date()
      const sevenDaysLater = new Date(now)
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

      // Fetch active schedule slots
      const slots = await prisma.scheduleSlot.findMany({
        where: { orgId, isActive: true },
        include: { service: true },
      })

      if (slots.length === 0) {
        return 'Nenhum horario configurado no momento.'
      }

      // Fetch existing bookings in the next 7 days
      const bookings = await prisma.booking.findMany({
        where: {
          orgId,
          startsAt: { gte: now, lte: sevenDaysLater },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { startsAt: true, trainerId: true, serviceId: true },
      })

      const bookedKeys = new Set(
        bookings.map(
          (b) =>
            `${b.trainerId}-${b.serviceId}-${b.startsAt.toISOString().substring(0, 16)}`
        )
      )

      // Group available slots by date
      const availabilityByDay: Record<string, string[]> = {}

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
      const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(now)
        date.setDate(date.getDate() + dayOffset)
        const dayOfWeek = date.getDay()
        const dateStr = `${dayNames[dayOfWeek]} ${date.getDate()}/${monthNames[date.getMonth()]}`

        const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek)

        for (const slot of daySlots) {
          // Check if this slot is already booked
          const slotDate = new Date(date)
          const [slotHour, slotMinute] = slot.startTime.split(':').map(Number)
          slotDate.setHours(slotHour, slotMinute, 0, 0)

          // Skip slots in the past
          if (slotDate <= now) continue

          const key = `${slot.trainerId}-${slot.serviceId}-${slotDate.toISOString().substring(0, 16)}`
          if (!bookedKeys.has(key)) {
            if (!availabilityByDay[dateStr]) {
              availabilityByDay[dateStr] = []
            }
            availabilityByDay[dateStr].push(`${slot.startTime} (${slot.service.name})`)
          }
        }
      }

      const entries = Object.entries(availabilityByDay)
      if (entries.length === 0) {
        return 'Nenhum horario disponivel nos proximos 7 dias.'
      }

      return entries
        .map(([day, times]) => `${day}: ${times.join(', ')}`)
        .join('\n')
    } catch (error) {
      console.error('[SLOTS] Error building available slots:', error)
      return 'Disponibilidade sera confirmada em breve.'
    }
  }

  /**
   * Build context data to inject into Claude's system prompt
   */
  private async buildContextData(
    org: {
      name: string
      phone: string | null
      address: string | null
      chatbotConfig: unknown
      services: Array<{
        name: string
        description: string | null
        durationMinutes: number
        price: number | { toString(): string }
        maxCapacity: number
      }>
    },
    _conversation: unknown,
    orgId: string
  ): Promise<Record<string, string>> {
    const config = (org.chatbotConfig as Record<string, unknown>) || {}

    const businessData = [
      `Nome: ${org.name}`,
      config.businessHours
        ? `Horário de funcionamento: ${config.businessHours}`
        : '',
      org.phone ? `Telefone: ${org.phone}` : '',
      org.address ? `Endereço: ${org.address}` : '',
      config.knowledgeBase
        ? `\nInformações adicionais:\n${config.knowledgeBase}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const services = org.services
      .map(
        (s) =>
          `- ${s.name}: ${s.description || 'Sem descrição'} | Duração: ${s.durationMinutes}min | Preço: R$ ${s.price} | Capacidade: ${s.maxCapacity}`
      )
      .join('\n')

    const plans = config.plans
      ? JSON.stringify(config.plans, null, 2)
      : 'Nenhum plano configurado'

    // Real availability check
    const availableSlots = await this.buildAvailableSlots(orgId)

    return {
      businessData,
      services: services || 'Nenhum serviço cadastrado',
      plans,
      availableSlots,
    }
  }

  /**
   * Execute an action parsed from Claude's response
   */
  private async executeAction(
    action: ChatAction,
    orgId: string,
    conversationId: string,
    phone: string
  ): Promise<void> {
    switch (action.type) {
      case 'CREATE_BOOKING':
        await this.handleCreateBooking(action.data, orgId, phone)
        break

      case 'CANCEL_BOOKING':
        await this.handleCancelBooking(action.data, orgId)
        break

      case 'INITIATE_SALE':
        await this.handleInitiateSale(action.data, orgId, phone)
        break

      case 'SWITCH_MODE':
        // Mode switch is handled in the main flow
        break

      case 'ESCALATE_HUMAN':
        await this.handleEscalateHuman(conversationId, orgId, phone)
        break
    }
  }

  /**
   * Create a booking from chatbot interaction
   */
  private async handleCreateBooking(
    data: Record<string, string>,
    orgId: string,
    phone: string
  ): Promise<void> {
    try {
      // Find the service
      const service = await prisma.service.findFirst({
        where: {
          orgId,
          name: { contains: data.service, mode: 'insensitive' },
          isActive: true,
        },
      })

      if (!service) {
        console.log(`[BOOKING] Service not found: ${data.service}`)
        return
      }

      // Find student by phone
      const student = await prisma.profile.findFirst({
        where: { orgId, phone: { contains: phone }, role: 'STUDENT' },
      })

      // Find trainer
      const trainer = await prisma.profile.findFirst({
        where: {
          orgId,
          role: 'TRAINER',
          ...(data.trainer !== 'qualquer' && {
            fullName: { contains: data.trainer, mode: 'insensitive' },
          }),
        },
      })

      if (!trainer) {
        console.log(`[BOOKING] Trainer not found: ${data.trainer}`)
        return
      }

      // Parse date/time
      const [day, month, year] = data.date.split('/')
      const [hour, minute] = data.time.split(':')
      const startsAt = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      )
      const endsAt = new Date(
        startsAt.getTime() + service.durationMinutes * 60000
      )

      // Create booking
      if (student) {
        await prisma.booking.create({
          data: {
            orgId,
            serviceId: service.id,
            trainerId: trainer.id,
            studentId: student.id,
            startsAt,
            endsAt,
            status: 'CONFIRMED',
            source: 'WHATSAPP',
          },
        })
        console.log('[BOOKING] Created', { bookingId: booking.id })

        // Send WhatsApp confirmation
        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (org?.whatsappInstanceId) {
          const formattedDate = startsAt.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
          const formattedTime = startsAt.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })

          const confirmationMsg =
            `✅ *Agendamento Confirmado!*\n\n` +
            `📅 *Serviço:* ${service.name}\n` +
            `📆 *Data:* ${formattedDate}\n` +
            `🕐 *Horário:* ${formattedTime}\n\n` +
            `Em caso de imprevistos, nos avise com antecedência. Até lá! 💪`

          await evolutionClient.sendText({
            instanceName: org.whatsappInstanceId,
            to: phone,
            text: confirmationMsg,
          })
        }
      }
    } catch (error) {
      console.error('[BOOKING] Error creating booking:', error)
    }
  }

  /**
   * Cancel a booking from chatbot interaction
   */
  private async handleCancelBooking(
    data: Record<string, string>,
    orgId: string
  ): Promise<void> {
    try {
      await prisma.booking.update({
        where: { id: data.bookingId, orgId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: data.reason,
        },
      })
      console.log(`[BOOKING] Cancelled: ${data.bookingId}`)
    } catch (error) {
      console.error('[BOOKING] Error cancelling:', error)
    }
  }

  /**
   * Initiate a sale from chatbot interaction
   */
  private async handleInitiateSale(
    data: Record<string, string>,
    orgId: string,
    phone: string
  ): Promise<void> {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY

      if (stripeKey) {
        // Try to create a Stripe payment link
        try {
          // First, find or look up a price ID for the plan
          // We use a generic product name for now and create a one-time price
          const productRes = await fetch('https://api.stripe.com/v1/products', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              name: data.plan || 'Plano Fitness',
              description: `Venda via FitBot para ${data.name} (${phone})`,
            }),
          })

          if (!productRes.ok) throw new Error('Failed to create Stripe product')
          const product = await productRes.json() as { id: string }

          const priceRes = await fetch('https://api.stripe.com/v1/prices', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              product: product.id,
              currency: 'brl',
              // Default amount — a real implementation would look up the plan price
              unit_amount: '9900',
            }),
          })

          if (!priceRes.ok) throw new Error('Failed to create Stripe price')
          const price = await priceRes.json() as { id: string }

          const linkRes = await fetch('https://api.stripe.com/v1/payment_links', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              'line_items[0][price]': price.id,
              'line_items[0][quantity]': '1',
              'metadata[orgId]': orgId,
              'metadata[phone]': phone,
              'metadata[plan]': data.plan,
            }),
          })

          if (!linkRes.ok) throw new Error('Failed to create payment link')
          const paymentLink = await linkRes.json() as { url: string }

          console.log(`[SALE] Stripe payment link created: ${paymentLink.url}`)

          // Send the payment link via WhatsApp
          const org = await prisma.organization.findUnique({ where: { id: orgId } })
          if (org?.whatsappInstanceId) {
            await evolutionClient.sendText({
              instanceName: org.whatsappInstanceId,
              to: phone,
              text:
                `💳 *Aqui está o seu link de pagamento para o ${data.plan}:*\n\n` +
                `${paymentLink.url}\n\n` +
                `O link é seguro e processado pelo Stripe. Qualquer dúvida, estamos aqui! 😊`,
            })
          }
          return
        } catch (stripeError) {
          console.error('[SALE] Stripe error, falling back to human handoff:', stripeError)
        }
      }

      // Fallback: notify human team via WhatsApp
      const org = await prisma.organization.findUnique({ where: { id: orgId } })
      if (org?.whatsappInstanceId) {
        const fallbackMsg =
          `👋 Ótimo interesse no ${data.plan || 'nosso plano'}!\n\n` +
          `Nossa equipe vai entrar em contato com você em breve para finalizar a sua matricula e oferecer as melhores condições. ` +
          `Fique de olho no WhatsApp! 😊\n\n` +
          `_Equipe ${org.name}_`

        await evolutionClient.sendText({
          instanceName: org.whatsappInstanceId,
          to: phone,
          text: fallbackMsg,
        })
      }

      console.log(
        `[SALE] Human fallback initiated - Plan: ${data.plan}`
      )
    } catch (error) {
      console.error('[SALE] Error initiating sale:', error)
    }
  }

  /**
   * Handle ESCALATE_HUMAN: notify admin via WhatsApp and update conversation
   */
  private async handleEscalateHuman(
    conversationId: string,
    orgId: string,
    clientPhone: string
  ): Promise<void> {
    try {
      const org = await prisma.organization.findUnique({ where: { id: orgId } })

      // Update conversation to HUMAN_HANDOFF
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { currentMode: 'HUMAN_HANDOFF' },
      })

      // Notify admin via WhatsApp if configured
      if (org?.phone && org.whatsappInstanceId) {
        const alertMsg =
          `🚨 *Atendimento Humano Solicitado*\n\n` +
          `Um cliente precisa de atendimento humano.\n\n` +
          `📱 *Contato:* ${clientPhone}\n` +
          `🕐 *Horário:* ${new Date().toLocaleString('pt-BR')}\n\n` +
          `Por favor, entre em contato com o cliente o mais rápido possível.`

        await evolutionClient.sendText({
          instanceName: org.whatsappInstanceId,
          to: org.phone,
          text: alertMsg,
        })
      }

      console.log(`[ESCALATE] Conversation ${conversationId} set to HUMAN_HANDOFF. Admin notified.`)
      // Note: clientPhone not logged to avoid PII in logs
    } catch (error) {
      console.error('[ESCALATE] Error handling escalation:', error)
    }
  }
}

export const fitBotOrchestrator = new FitBotOrchestrator()
