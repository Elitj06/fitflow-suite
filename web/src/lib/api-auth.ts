/**
 * API Key authentication for public v1 endpoints.
 * Used by external agents (e.g. Laura/OpenClaw) to integrate with FitFlow.
 */

import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

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
