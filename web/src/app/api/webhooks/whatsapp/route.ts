import { NextRequest, NextResponse } from 'next/server'
import { fitBotOrchestrator } from '@/chatbot-engine/orchestrator'
import type { WebhookPayload } from '@/chatbot-engine/integrations/evolution'
import crypto from 'crypto'

/**
 * Verify Evolution API webhook signature
 * Evolution API supports HMAC-SHA256 signatures via X-Hub-Signature-256 header.
 */
function verifyEvolutionSignature(
  body: string,
  sigHeader: string | null,
  secret: string
): boolean {
  if (!sigHeader) return false
  // Expected format: "sha256=<hex>"
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (expected.length !== sigHeader.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader))
}

/**
 * POST /api/webhooks/whatsapp
 * Receives webhooks from Evolution API
 *
 * Evolution API sends events for:
 * - MESSAGES_UPSERT: New message received
 * - MESSAGES_UPDATE: Message status update
 * - CONNECTION_UPDATE: Instance connection changes
 * - QRCODE_UPDATED: New QR code for pairing
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // CRITICAL FIX: Verify Evolution API webhook signature when secret is configured
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET
    if (webhookSecret) {
      const sigHeader = request.headers.get('x-hub-signature-256')
      if (!verifyEvolutionSignature(rawBody, sigHeader, webhookSecret)) {
        console.error('[WhatsApp Webhook] Invalid or missing signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    let payload: WebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Get org ID from query param or header
    const orgId =
      request.nextUrl.searchParams.get('orgId') ||
      request.headers.get('x-org-id')

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing orgId parameter' },
        { status: 400 }
      )
    }

    // Validate orgId format (cuid: starts with c, alphanumeric, ~25 chars)
    if (!/^c[a-z0-9]{20,30}$/.test(orgId)) {
      return NextResponse.json({ error: 'Invalid orgId' }, { status: 400 })
    }

    // Only process new incoming messages
    if (payload.event !== 'MESSAGES_UPSERT') {
      return NextResponse.json({ status: 'ignored', event: payload.event })
    }

    // Skip messages from self
    if (payload.data?.key?.fromMe) {
      return NextResponse.json({ status: 'ignored', reason: 'fromMe' })
    }

    // Process the message through FitBot
    const result = await fitBotOrchestrator.processIncomingMessage(
      payload,
      orgId
    )

    if (!result.success) {
      console.error('[Webhook] Processing failed:', result.error)
      return NextResponse.json(
        { status: 'error', error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'processed',
      response: result.responseText.substring(0, 50) + '...',
      action: result.action?.type || null,
    })
  } catch (error) {
    console.error('[Webhook] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Health check for the webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'FitBot AI Webhook',
    timestamp: new Date().toISOString(),
  })
}
