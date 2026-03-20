/**
 * Wellhub (formerly Gympass) Integration
 * 
 * Implements:
 * - Check-in Webhook: receives notifications when Wellhub users check in
 * - User Status API: verifies user eligibility in real-time
 * - Events API: reports usage events back to Wellhub for payment calculation
 * - Booking Webhooks: receives booking/cancel/checkin events
 * 
 * Docs: https://developers.gympass.com
 */

import crypto from 'crypto'

// ============================================
// TYPES
// ============================================

export interface WellhubCheckinPayload {
  gym_id: string
  user: {
    unique_identifier: string
    email?: string
    name?: string
  }
  checkin_datetime: string
  source: string
}

export interface WellhubBookingPayload {
  booking_number: string
  gym_id: string
  class_id: string
  user: {
    unique_identifier: string
    email?: string
    name?: string
  }
  booking_datetime: string
  status: 'booked' | 'cancelled' | 'checked_in'
}

export interface WellhubUserStatusPayload {
  user_id: string
  status: number // 0=cancelled, 1=active, 2+=higher tiers
  product_id?: string
}

export interface WellhubUserStatusChangePayload {
  user_unique_identifier: string
  status: number
  product_id?: string
  timestamp: string
}

export interface WellhubEventPayload {
  user_id: string
  event_type: 'signup' | 'class_booking' | 'class_attendance' | 'checkin'
  event_datetime: string
  metadata?: Record<string, string>
}

// ============================================
// SIGNATURE VERIFICATION
// ============================================

export function verifyWellhubSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha1', secret)
  hmac.update(body)
  const computed = hmac.digest('hex').toUpperCase()
  return computed === signature.toUpperCase()
}

// ============================================
// WELLHUB CLIENT
// ============================================

export class WellhubClient {
  private apiBaseUrl: string
  private partnerId: string
  private partnerSecret: string

  constructor() {
    this.apiBaseUrl = process.env.WELLHUB_API_URL || 'https://api.gympass.com'
    this.partnerId = process.env.WELLHUB_PARTNER_ID || ''
    this.partnerSecret = process.env.WELLHUB_SECRET_KEY || ''
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.partnerSecret}`,
      'X-Partner-Id': this.partnerId,
    }
  }

  /**
   * Verify user status in real-time before allowing check-in or booking
   * Call this whenever a Wellhub user schedules or uses a service
   */
  async verifyUserStatus(userUniqueId: string): Promise<{
    active: boolean
    status: number
    productId?: string
  }> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/partner/v1/user/${userUniqueId}/status`,
        { headers: this.headers }
      )

      if (!response.ok) {
        console.error('[Wellhub] User status check failed:', response.status)
        return { active: false, status: 0 }
      }

      const data = await response.json()
      return {
        active: data.status > 0,
        status: data.status,
        productId: data.product_id,
      }
    } catch (error) {
      console.error('[Wellhub] User status error:', error)
      return { active: false, status: 0 }
    }
  }

  /**
   * Report usage event to Wellhub (required for payment calculation)
   * Events must be sent the same day they occur
   * All events from previous month must arrive by 5th of following month
   */
  async reportEvent(event: WellhubEventPayload): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/partner/v1/events`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            user_id: event.user_id,
            event_type: event.event_type,
            event_datetime: event.event_datetime,
            metadata: event.metadata || {},
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Wellhub] Event report failed:', response.status, errorText)
        return false
      }

      console.log(`[Wellhub] Event reported: ${event.event_type} for user ${event.user_id}`)
      return true
    } catch (error) {
      console.error('[Wellhub] Event report error:', error)
      return false
    }
  }

  /**
   * Report a check-in event (payable event)
   */
  async reportCheckin(userId: string, checkinDatetime: string): Promise<boolean> {
    return this.reportEvent({
      user_id: userId,
      event_type: 'checkin',
      event_datetime: checkinDatetime,
    })
  }

  /**
   * Report a class attendance event (payable event)
   */
  async reportClassAttendance(
    userId: string,
    datetime: string,
    classId?: string
  ): Promise<boolean> {
    return this.reportEvent({
      user_id: userId,
      event_type: 'class_attendance',
      event_datetime: datetime,
      metadata: classId ? { class_id: classId } : undefined,
    })
  }

  /**
   * Report first-time signup event (interaction event - sent once)
   */
  async reportSignup(userId: string, signupDatetime: string): Promise<boolean> {
    return this.reportEvent({
      user_id: userId,
      event_type: 'signup',
      event_datetime: signupDatetime,
    })
  }

  /**
   * Verify webhook signature from Wellhub
   */
  verifySignature(body: string, signature: string): boolean {
    return verifyWellhubSignature(body, signature, this.partnerSecret)
  }
}

export const wellhubClient = new WellhubClient()
