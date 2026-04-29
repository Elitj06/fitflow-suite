/**
 * GET /api/v1/action/formatted?action=<type>&<params>
 *
 * Unified formatted endpoint for Laura.
 * Returns ready-to-send WhatsApp text — no model processing needed.
 *
 * Architecture:
 *   route.ts (this file) → action router + auth
 *   actions/booking.ts   → book, cancel, agenda, availability, search-student
 *   actions/info.ts      → info-plans, info-professors, info-hours, info-cancellation, info-aggregators, info-checkin
 *   actions/coins.ts     → coins-balance, coins-leaderboard
 *   actions/reports.ts   → report-demand, report-general, report-attendance
 *   lib/constants.ts     → shared types, helpers, studio config
 *
 * Authentication: x-api-key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'

import { bookAction, cancelAction, agendaAction, availabilityAction, searchStudentAction } from './actions/booking'
import {
  infoPlansWithOrgAction, infoProfessorsAction, infoHoursAction,
  infoCancellationAction, infoAggregatorsAction, infoCheckinAction,
} from './actions/info'
import { coinsBalanceAction, coinsLeaderboardAction } from './actions/coins'
import { reportDemandAction, reportGeneralAction, reportAttendanceAction } from './actions/reports'

const AVAILABLE_ACTIONS = [
  'book', 'cancel', 'agenda', 'availability', 'search-student',
  'info-plans', 'info-professors', 'info-hours', 'info-cancellation',
  'info-aggregators', 'info-checkin',
  'coins-balance', 'coins-leaderboard',
  'report-demand', 'report-general', 'report-attendance',
] as const

type ActionName = typeof AVAILABLE_ACTIONS[number]

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx
  const { searchParams } = request.nextUrl
  const action = (searchParams.get('action') || '') as ActionName

  if (!AVAILABLE_ACTIONS.includes(action)) {
    return NextResponse.json({
      error: `Unknown action: "${action}"`,
      available: AVAILABLE_ACTIONS,
    }, { status: 400 })
  }

  try {
    const result = await dispatchAction(action, orgId, searchParams)
    return NextResponse.json({
      action,
      text: result.text,
      requiresModelFollowup: result.requiresModelFollowup || undefined,
    })
  } catch (error) {
    console.error(`[v1/action/formatted] Error for action=${action}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function dispatchAction(
  action: ActionName,
  orgId: string,
  params: URLSearchParams,
) {
  switch (action) {
    // Booking
    case 'book':
      return bookAction(orgId, {
        studentId: params.get('studentId') || '',
        name: params.get('name') || '',
        date: params.get('date') || '',
        time: params.get('time') || '',
        serviceId: params.get('serviceId') || undefined,
      })
    case 'cancel':
      return cancelAction(orgId, params.get('bookingId') || '', params.get('name') || 'Aluno')
    case 'agenda':
      return agendaAction(orgId, params.get('date') || new Date().toISOString().split('T')[0])
    case 'availability':
      return availabilityAction(orgId, params.get('date') || new Date().toISOString().split('T')[0])
    case 'search-student':
      return searchStudentAction(orgId, params.get('name') || '')

    // Info
    case 'info-plans':
      return infoPlansWithOrgAction(orgId)
    case 'info-professors':
      return infoProfessorsAction(orgId)
    case 'info-hours':
      return infoHoursAction()
    case 'info-cancellation':
      return infoCancellationAction()
    case 'info-aggregators':
      return infoAggregatorsAction()
    case 'info-checkin':
      return infoCheckinAction()

    // Coins
    case 'coins-balance':
      return coinsBalanceAction(orgId, params.get('studentId') || '')
    case 'coins-leaderboard':
      return coinsLeaderboardAction(orgId)

    // Reports
    case 'report-demand':
      return reportDemandAction(orgId, params.get('month'))
    case 'report-general':
      return reportGeneralAction(orgId)
    case 'report-attendance':
      return reportAttendanceAction(orgId, params.get('period') || 'month')
  }
}
