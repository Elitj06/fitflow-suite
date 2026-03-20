/**
 * TotalPass Integration
 * 
 * TotalPass uses API Key + Integration Code per gym.
 * Integration modes:
 * 1. Check-in only: users check in at location (150m radius via TotalPass app)
 * 2. Booking + Check-in: users book a slot, then check in physically
 *
 * Flow:
 * - Gym registers as TotalPass partner (free)
 * - Gets API Key (format: XXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
 * - Gets Integration Code per unit (8 chars: "12ABCD3E")
 * - TotalPass sends check-in/booking webhooks to our endpoint
 * - We validate and sync with FitFlow system
 * 
 * Compatible ERPs: EVO, Cloud Gym, Next Fit, HubFit, Tecnofit, etc.
 * FitFlow becomes a compatible ERP partner.
 */

// ============================================
// TYPES
// ============================================

export interface TotalPassConfig {
  apiKey: string            // Format: XXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
  integrationCode: string   // 8-char code per unit: "12ABCD3E"
  mode: 'checkin_only' | 'booking_and_checkin'
  enabled: boolean
}

export interface TotalPassCheckinPayload {
  token: string             // User's check-in token
  user_id: string
  user_name: string
  user_email?: string
  user_cpf?: string         // Brazilian ID (masked)
  gym_id: string
  checkin_at: string        // ISO datetime
  plan_name: string         // e.g., "TotalPass GO", "TotalPass 1"
  integration_code: string
}

export interface TotalPassBookingPayload {
  booking_id: string
  user_id: string
  user_name: string
  user_email?: string
  gym_id: string
  class_name: string
  class_datetime: string
  status: 'booked' | 'cancelled' | 'checked_in'
  integration_code: string
}

export interface TotalPassValidationResult {
  valid: boolean
  user_name?: string
  plan_name?: string
  error?: string
}

// ============================================
// TOTALPASS CLIENT
// ============================================

export class TotalPassClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.TOTALPASS_API_URL || 'https://api.totalpass.com.br'
  }

  /**
   * Validate API Key format
   */
  static isValidApiKey(apiKey: string): boolean {
    const pattern = /^[A-Za-z0-9]{6,8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/
    return pattern.test(apiKey)
  }

  /**
   * Validate integration code format (8 alphanumeric chars)
   */
  static isValidIntegrationCode(code: string): boolean {
    return /^[A-Za-z0-9]{8}$/.test(code)
  }

  /**
   * Validate a check-in token from TotalPass user
   * When the user does check-in via TotalPass app within 150m radius,
   * TotalPass sends a webhook with the token. We validate it.
   */
  async validateCheckin(
    token: string,
    apiKey: string,
    integrationCode: string
  ): Promise<TotalPassValidationResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/checkin/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'X-Integration-Code': integrationCode,
          },
          body: JSON.stringify({ token }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          valid: false,
          error: errorData.message || `HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      return {
        valid: true,
        user_name: data.user_name,
        plan_name: data.plan_name,
      }
    } catch (error) {
      console.error('[TotalPass] Validation error:', error)
      return {
        valid: false,
        error: 'Connection error',
      }
    }
  }

  /**
   * Confirm check-in back to TotalPass
   * Called after successful validation and registration in our system
   */
  async confirmCheckin(
    token: string,
    apiKey: string,
    integrationCode: string
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/checkin/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'X-Integration-Code': integrationCode,
          },
          body: JSON.stringify({
            token,
            confirmed_at: new Date().toISOString(),
          }),
        }
      )

      return response.ok
    } catch (error) {
      console.error('[TotalPass] Confirm error:', error)
      return false
    }
  }

  /**
   * Sync available classes/schedules to TotalPass
   * Required when mode is 'booking_and_checkin'
   * TotalPass will display these classes for users to book
   */
  async syncClasses(
    apiKey: string,
    integrationCode: string,
    classes: Array<{
      id: string
      name: string
      datetime: string
      duration_minutes: number
      max_capacity: number
      available_spots: number
      instructor: string
    }>
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/classes/sync`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'X-Integration-Code': integrationCode,
          },
          body: JSON.stringify({ classes }),
        }
      )

      if (!response.ok) {
        console.error('[TotalPass] Class sync failed:', response.status)
        return false
      }

      console.log(`[TotalPass] Synced ${classes.length} classes`)
      return true
    } catch (error) {
      console.error('[TotalPass] Sync error:', error)
      return false
    }
  }

  /**
   * Validate webhook authenticity using API Key
   */
  validateWebhookAuth(
    requestApiKey: string,
    storedApiKey: string
  ): boolean {
    return requestApiKey === storedApiKey
  }
}

export const totalPassClient = new TotalPassClient()
