import { NextRequest, NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'
import { getAuthenticatedProfile } from '@/lib/api-auth'

const PROJECT = 'fitflow-ia'
const DATASET = 'fitflow'

function getBigQueryClient(): BigQuery {
  const keyFile =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    '/root/.openclaw/workspace/credentials/google-service-account.json'

  return new BigQuery({
    projectId: PROJECT,
    keyFilename: keyFile,
  })
}

async function runQuery(sql: string) {
  const bq = getBigQueryClient()
  const [rows] = await bq.query({ query: sql, location: 'US' })
  return rows
}

// ── Overview: total students, bookings 30d, presence rate, channel distribution
async function getOverview() {
  const [totals, channels] = await Promise.all([
    runQuery(`
      SELECT
        (SELECT COUNT(*) FROM \`${PROJECT}.${DATASET}.students\`) AS total_students,
        COUNT(b.id) AS bookings_30d,
        COUNTIF(ck.id IS NOT NULL) AS presences_30d,
        ROUND(COUNTIF(ck.id IS NOT NULL) / NULLIF(COUNT(b.id), 0) * 100, 1) AS presence_rate
      FROM \`${PROJECT}.${DATASET}.bookings\` b
      LEFT JOIN \`${PROJECT}.${DATASET}.checkins\` ck ON ck.booking_id = b.id
      WHERE b.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `),
    runQuery(`
      SELECT
        COALESCE(s.source, 'direct') AS canal,
        COUNT(DISTINCT s.id) AS alunos,
        ROUND(COUNT(DISTINCT s.id) / SUM(COUNT(DISTINCT s.id)) OVER() * 100, 1) AS pct_alunos,
        COUNT(b.id) AS agendamentos_30d,
        COUNTIF(ck.id IS NOT NULL) AS presencas_30d
      FROM \`${PROJECT}.${DATASET}.students\` s
      LEFT JOIN \`${PROJECT}.${DATASET}.bookings\` b
        ON b.student_id = s.id AND b.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      LEFT JOIN \`${PROJECT}.${DATASET}.checkins\` ck ON ck.booking_id = b.id
      GROUP BY canal
      ORDER BY alunos DESC
    `),
  ])

  const summary = totals[0] || {}
  return {
    total_students: Number(summary.total_students) || 0,
    bookings_30d: Number(summary.bookings_30d) || 0,
    presences_30d: Number(summary.presences_30d) || 0,
    presence_rate: Number(summary.presence_rate) || 0,
    channels: channels.map((r: Record<string, unknown>) => ({
      canal: r.canal,
      alunos: Number(r.alunos),
      pct_alunos: Number(r.pct_alunos),
      agendamentos_30d: Number(r.agendamentos_30d),
      presencas_30d: Number(r.presencas_30d),
    })),
  }
}

// ── Churn: students not seen for 14+ days (top 20)
async function getChurn() {
  const rows = await runQuery(`
    SELECT
      s.id AS student_id,
      COALESCE(s.source, 'direct') AS source,
      s.coins_balance,
      br.name AS unidade,
      MAX(b.date) AS ultimo_agendamento,
      DATE_DIFF(CURRENT_DATE(), MAX(b.date), DAY) AS dias_sem_aparecer
    FROM \`${PROJECT}.${DATASET}.students\` s
    LEFT JOIN \`${PROJECT}.${DATASET}.bookings\` b ON b.student_id = s.id
    LEFT JOIN \`${PROJECT}.${DATASET}.branches\` br ON br.id = s.branch_id
    GROUP BY s.id, s.source, s.coins_balance, br.name
    HAVING dias_sem_aparecer > 14 OR ultimo_agendamento IS NULL
    ORDER BY dias_sem_aparecer DESC
    LIMIT 20
  `)

  return rows.map((r: Record<string, unknown>) => ({
    student_id: r.student_id,
    source: r.source,
    coins_balance: Number(r.coins_balance) || 0,
    unidade: r.unidade || 'N/A',
    ultimo_agendamento: r.ultimo_agendamento
      ? String(r.ultimo_agendamento)
      : null,
    dias_sem_aparecer: r.dias_sem_aparecer != null
      ? Number(r.dias_sem_aparecer)
      : null,
  }))
}

// ── Peak hours: busiest time slots by branch
async function getPeakHours() {
  const rows = await runQuery(`
    SELECT
      br.name AS unidade,
      b.time AS horario,
      COUNT(*) AS total_agendamentos,
      COUNTIF(ck.id IS NOT NULL) AS presencas
    FROM \`${PROJECT}.${DATASET}.bookings\` b
    LEFT JOIN \`${PROJECT}.${DATASET}.checkins\` ck ON ck.booking_id = b.id
    LEFT JOIN \`${PROJECT}.${DATASET}.branches\` br ON br.id = b.branch_id
    WHERE b.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      AND b.status != 'CANCELLED'
    GROUP BY br.name, b.time
    ORDER BY br.name, total_agendamentos DESC
  `)

  return rows.map((r: Record<string, unknown>) => ({
    unidade: r.unidade || 'N/A',
    horario: r.horario,
    total_agendamentos: Number(r.total_agendamentos),
    presencas: Number(r.presencas),
  }))
}

// ── Services: top booked services
async function getServices() {
  const rows = await runQuery(`
    SELECT
      b.service_name AS servico,
      br.name AS unidade,
      COUNT(*) AS agendamentos,
      COUNTIF(ck.id IS NOT NULL) AS presencas,
      COUNTIF(b.status = 'CANCELLED') AS cancelamentos,
      ROUND(COUNTIF(b.status = 'CANCELLED') / COUNT(*) * 100, 1) AS taxa_cancelamento_pct
    FROM \`${PROJECT}.${DATASET}.bookings\` b
    LEFT JOIN \`${PROJECT}.${DATASET}.checkins\` ck ON ck.booking_id = b.id
    LEFT JOIN \`${PROJECT}.${DATASET}.branches\` br ON br.id = b.branch_id
    WHERE b.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY b.service_name, br.name
    ORDER BY agendamentos DESC
    LIMIT 20
  `)

  return rows.map((r: Record<string, unknown>) => ({
    servico: r.servico,
    unidade: r.unidade || 'N/A',
    agendamentos: Number(r.agendamentos),
    presencas: Number(r.presencas),
    cancelamentos: Number(r.cancelamentos),
    taxa_cancelamento_pct: Number(r.taxa_cancelamento_pct),
  }))
}

// ── Growth: new students per week (last 12 weeks)
async function getGrowth() {
  const rows = await runQuery(`
    SELECT
      FORMAT_TIMESTAMP('%Y-%m-%d', DATE_TRUNC(s.created_at, WEEK)) AS semana,
      COALESCE(s.source, 'direct') AS canal,
      COUNT(*) AS novos_alunos
    FROM \`${PROJECT}.${DATASET}.students\` s
    WHERE s.created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 84 DAY)
    GROUP BY semana, canal
    ORDER BY semana DESC, novos_alunos DESC
  `)

  return rows.map((r: Record<string, unknown>) => ({
    semana: r.semana,
    canal: r.canal,
    novos_alunos: Number(r.novos_alunos),
  }))
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const profile = await getAuthenticatedProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (profile.role === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'overview'

    let data: unknown

    switch (metric) {
      case 'overview':
        data = await getOverview()
        break
      case 'churn':
        data = await getChurn()
        break
      case 'peak_hours':
        data = await getPeakHours()
        break
      case 'services':
        data = await getServices()
        break
      case 'growth':
        data = await getGrowth()
        break
      default:
        return NextResponse.json(
          { error: `Unknown metric: ${metric}. Valid: overview|churn|peak_hours|services|growth` },
          { status: 400 }
        )
    }

    return NextResponse.json({ metric, data })
  } catch (error) {
    console.error('[BigQuery Analytics] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
