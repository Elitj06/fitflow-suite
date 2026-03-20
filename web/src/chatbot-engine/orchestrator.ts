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

      // 6. Build context data for the AI
      const contextData = this.buildContextData(org, conversation)

      // 7. Call Claude
      const currentMode = conversation.currentMode as ChatMode
      const aiResponse = await claudeClient.chat(
        currentMode === 'HUMAN_HANDOFF' ? 'ATTENDANCE' : currentMode,
        claudeMessages,
        contextData
      )

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
            currentMode: action.data.newMode as any,
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
   * Build context data to inject into Claude's system prompt
   */
  private buildContextData(
    org: any,
    conversation: any
  ): Record<string, string> {
    const config = (org.chatbotConfig as any) || {}

    const businessData = [
      `Nome: ${org.name}`,
      config.businessHours
        ? `Horário de funcionamento: ${config.businessHours}`
        : '',
      org.phone ? `Telefone: ${org.phone}` : '',
      org.address ? `Endereço: ${org.address}` : '',
      config.knowledgeBase
        ? `\nInformações adicionais:\n${config.knowledgeBase.join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const services = org.services
      .map(
        (s: any) =>
          `- ${s.name}: ${s.description || 'Sem descrição'} | Duração: ${s.durationMinutes}min | Preço: R$ ${s.price} | Capacidade: ${s.maxCapacity}`
      )
      .join('\n')

    const plans = config.plans
      ? JSON.stringify(config.plans, null, 2)
      : 'Nenhum plano configurado'

    return {
      businessData,
      services: services || 'Nenhum serviço cadastrado',
      plans,
      availableSlots: 'Consulta de disponibilidade será feita em tempo real',
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
        // TODO: Notify admin via dashboard/push
        console.log(`[ESCALATE] Conversation ${conversationId} needs human`)
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
        console.log(`[BOOKING] Created for ${phone} at ${startsAt}`)
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
      // TODO: Create Stripe/Asaas payment link
      // TODO: Send payment link via WhatsApp
      console.log(
        `[SALE] Initiated for ${data.name} - Plan: ${data.plan} - Phone: ${phone}`
      )
    } catch (error) {
      console.error('[SALE] Error initiating sale:', error)
    }
  }
}

export const fitBotOrchestrator = new FitBotOrchestrator()
