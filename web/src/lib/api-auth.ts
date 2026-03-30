/**
 * API Key authentication for public v1 endpoints.
 * Used by external agents (e.g. Laura/OpenClaw) to integrate with FitFlow.
 */

import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ApiKeyContext {
  orgId: string
}

/**
 * Verifies the x-api-key header against the database.
 * Returns { orgId } if valid, null otherwise.
 */
export async function verifyApiKey(
  request: NextRequest
): Promise<ApiKeyContext | null> {
  const key = request.headers.get('x-api-key')
  if (!key || key.trim() === '') return null

  try {
    // Try Supabase REST first (more reliable in serverless/edge)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/organizations?api_key=eq.${encodeURIComponent(key)}&select=id`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      )

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          return { orgId: data[0].id }
        }
        return null
      }
    }

    // Fallback: Prisma
    const org = await prisma.organization.findFirst({
      where: { apiKey: key },
      select: { id: true },
    })

    if (!org) return null
    return { orgId: org.id }
  } catch {
    return null
  }
}

/**
 * Returns the authenticated user's Profile (with organization) or null.
 * Centralizes the repeated getProfile() pattern across API routes.
 */
export async function getAuthenticatedProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { organization: true },
  })
  return profile
}
