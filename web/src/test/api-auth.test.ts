import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { verifyApiKey } from '@/lib/api-auth'
import { NextRequest } from 'next/server'

function makeRequest(apiKey?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/test')
  if (apiKey) {
    req.headers.set('x-api-key', apiKey)
  }
  return req
}

describe('verifyApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve retornar null quando não há x-api-key header', async () => {
    const req = makeRequest()
    const result = await verifyApiKey(req)
    expect(result).toBeNull()
  })

  it('deve retornar null quando api key está vazia', async () => {
    const req = makeRequest('  ')
    const result = await verifyApiKey(req)
    expect(result).toBeNull()
  })

  it('deve retornar null quando api key não encontrada no banco', async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue(null)
    const req = makeRequest('invalid-key')
    const result = await verifyApiKey(req)
    expect(result).toBeNull()
  })

  it('deve retornar orgId quando api key é válida', async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({ id: 'org-123' } as any)
    const req = makeRequest('valid-key')
    const result = await verifyApiKey(req)
    expect(result).toEqual({ orgId: 'org-123' })
  })
})
