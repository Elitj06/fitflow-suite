/**
 * FitBot AI — Evolution API Integration
 * Handles WhatsApp messaging via Evolution API (self-hosted)
 */

interface SendMessageOptions {
  instanceName: string
  to: string
  text: string
}

interface SendButtonsOptions {
  instanceName: string
  to: string
  title: string
  description: string
  buttons: Array<{ buttonText: string; buttonId: string }>
}

interface SendListOptions {
  instanceName: string
  to: string
  title: string
  description: string
  buttonText: string
  sections: Array<{
    title: string
    rows: Array<{
      title: string
      description?: string
      rowId: string
    }>
  }>
}

interface WebhookPayload {
  event: string
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    pushName?: string
    message?: {
      conversation?: string
      extendedTextMessage?: { text: string }
      imageMessage?: { caption?: string; url?: string }
      audioMessage?: { url?: string }
      documentMessage?: { fileName?: string; url?: string }
      buttonsResponseMessage?: { selectedButtonId: string }
      listResponseMessage?: {
        singleSelectReply: { selectedRowId: string }
      }
    }
    messageType?: string
    messageTimestamp?: number
  }
}

export class EvolutionClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    const evolutionUrl = process.env.EVOLUTION_API_URL
    if (!evolutionUrl) throw new Error('EVOLUTION_API_URL environment variable is required')
    this.baseUrl = evolutionUrl
    this.apiKey = process.env.EVOLUTION_API_KEY || ''
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      apikey: this.apiKey,
    }
  }

  /**
   * Send a text message
   */
  async sendText({ instanceName, to, text }: SendMessageOptions): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          number: this.formatNumber(to),
          text,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(
        `Evolution API error: ${response.status} - ${await response.text()}`
      )
    }

    return response.json()
  }

  /**
   * Send interactive buttons
   */
  async sendButtons({
    instanceName,
    to,
    title,
    description,
    buttons,
  }: SendButtonsOptions): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/message/sendButtons/${instanceName}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          number: this.formatNumber(to),
          title,
          description,
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.buttonId, title: b.buttonText },
          })),
        }),
      }
    )

    if (!response.ok) {
      throw new Error(
        `Evolution API error: ${response.status} - ${await response.text()}`
      )
    }

    return response.json()
  }

  /**
   * Send a list message
   */
  async sendList({
    instanceName,
    to,
    title,
    description,
    buttonText,
    sections,
  }: SendListOptions): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/message/sendList/${instanceName}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          number: this.formatNumber(to),
          title,
          description,
          buttonText,
          sections,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(
        `Evolution API error: ${response.status} - ${await response.text()}`
      )
    }

    return response.json()
  }

  /**
   * Check instance connection status
   */
  async getInstanceStatus(instanceName: string): Promise<{
    connected: boolean
    qrcode?: string
  }> {
    const response = await fetch(
      `${this.baseUrl}/instance/connectionState/${instanceName}`,
      { headers: this.headers }
    )

    if (!response.ok) {
      return { connected: false }
    }

    const data = await response.json()
    return {
      connected: data.instance?.state === 'open',
    }
  }

  /**
   * Create a new instance
   */
  async createInstance(
    instanceName: string,
    webhookUrl: string
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/instance/create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        token: this.apiKey,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: false,
          headers: {},
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
          ],
        },
      }),
    })

    return response.json()
  }

  /**
   * Get QR Code for pairing
   */
  async getQRCode(instanceName: string): Promise<string | null> {
    const response = await fetch(
      `${this.baseUrl}/instance/connect/${instanceName}`,
      { headers: this.headers }
    )

    if (!response.ok) return null

    const data = await response.json()
    return data.base64 || null
  }

  /**
   * Extract message text from webhook payload
   */
  static extractMessageText(payload: WebhookPayload): string | null {
    const msg = payload.data?.message
    if (!msg) return null

    // Regular text
    if (msg.conversation) return msg.conversation
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text

    // Button reply
    if (msg.buttonsResponseMessage?.selectedButtonId) {
      return msg.buttonsResponseMessage.selectedButtonId
    }

    // List reply
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
      return msg.listResponseMessage.singleSelectReply.selectedRowId
    }

    // Image with caption
    if (msg.imageMessage?.caption) return msg.imageMessage.caption

    return null
  }

  /**
   * Extract sender info from webhook
   */
  static extractSenderInfo(payload: WebhookPayload): {
    phone: string
    name: string | null
    isFromMe: boolean
  } {
    const jid = payload.data?.key?.remoteJid || ''
    const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '')

    return {
      phone,
      name: payload.data?.pushName || null,
      isFromMe: payload.data?.key?.fromMe || false,
    }
  }

  /**
   * Format phone number for WhatsApp
   */
  private formatNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '')

    // Add Brazil country code if not present
    if (cleaned.length === 11) {
      cleaned = '55' + cleaned
    } else if (cleaned.length === 10) {
      // Old format without 9
      cleaned = '55' + cleaned
    }

    return cleaned
  }
}

export const evolutionClient = new EvolutionClient()
export type { WebhookPayload }
