/**
 * Shared types and constants for the formatted action endpoint.
 */

export const DAY_NAMES: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
}

export const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua',
  4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** Studio config that should eventually move to the database */
export const STUDIO_CONFIG = {
  name: 'Studio RR',
  unit: 'Recreio',
  maxCapacityPerTrainer: 22,
  bookingDurationMinutes: 60,
  hours: {
    weekday: { start: 6, end: 21 },
    saturday: { start: 8, end: 12 },
    sunday: null,
  },
  cancellation: {
    deadlineHours: 2,
    rule: 'Cancelar até 2h antes do horário. Após isso, conta como falta.',
  },
  checkin: {
    coinsPerCheckin: 1,
    rule: 'Check-in feito pelo professor na hora da aula. Cada check-in = 1 FitCoin.',
  },
  aggregators: [
    {
      name: 'Wellhub',
      alias: 'Gympass',
      accepted: true,
      plans: 'Wellhub Silver+',
      info: 'Plano empresarial via Gympass/Wellhub. O aluno cadastra o Studio RR no app e agenda normalmente.',
    },
    {
      name: 'TotalPass',
      alias: null,
      accepted: true,
      plans: 'TotalPass TP3+',
      info: 'Plano empresarial via TotalPass. O aluno cadastra o Studio RR no app e agenda normalmente.',
    },
  ],
} as const

// ─── Helpers ───

export interface ActionResult {
  text: string
  requiresModelFollowup?: boolean
}

/**
 * Parse a YYYY-MM-DD string into UTC Date components.
 * Returns null if invalid format.
 */
export function parseDate(dateStr: string): { year: number; month: number; day: number; utcDate: Date; dayOfWeek: number } | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, ys, ms, ds] = match
  const year = Number(ys), month = Number(ms), day = Number(ds)
  const utcDate = new Date(Date.UTC(year, month - 1, day))
  return { year, month, day, utcDate, dayOfWeek: utcDate.getUTCDay() }
}

/**
 * Parse HH:MM into hour and minute numbers.
 */
export function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

/**
 * Create UTC Date from BRT date+time.
 * BRT = UTC-3, so UTC = BRT + 3.
 */
export function brtToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0))
}

/**
 * Format a Date for BRT display (dd/mm).
 */
export function fmtDateBrt(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
}

/**
 * Format a Date for BRT time display (HH:MM).
 */
export function fmtTimeBrt(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a Date for full BRT display (weekday, dd/mm).
 */
export function fmtFullDateBrt(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit' })
}

/**
 * Get hour string from a Date in BRT (HH:00).
 */
export function getHourBrt(date: Date): string {
  return date.toLocaleTimeString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false })
}
