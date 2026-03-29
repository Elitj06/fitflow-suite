-- ============================================================
-- FitFlow Analytics — Queries BigQuery
-- Projeto: fitflow-ia | Dataset: fitflow
-- ============================================================

-- ── 1. Taxa de ocupação por unidade (últimos 30 dias) ────────
-- Percentual de agendamentos confirmados vs total por branch
SELECT
  br.name AS unidade,
  COUNT(b.id) AS total_agendamentos,
  COUNTIF(b.status = 'CONFIRMED') AS confirmados,
  COUNTIF(b.status = 'CANCELLED') AS cancelados,
  COUNTIF(ck.id IS NOT NULL) AS presencas,
  ROUND(COUNTIF(ck.id IS NOT NULL) / NULLIF(COUNT(b.id), 0) * 100, 1) AS taxa_presenca_pct
FROM `fitflow-ia.fitflow.bookings` b
LEFT JOIN `fitflow-ia.fitflow.checkins` ck ON ck.booking_id = b.id
LEFT JOIN `fitflow-ia.fitflow.branches` br ON br.id = b.branch_id
WHERE b.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY br.name
ORDER BY taxa_presenca_pct DESC;


-- ── 2. Alunos em risco de churn ──────────────────────────────
-- Alunos que não aparecem há mais de 14 dias
SELECT
  s.id AS student_id,
  s.source,
  s.coins_balance,
  br.name AS unidade,
  MAX(b.date) AS ultimo_agendamento,
  DATE_DIFF(CURRENT_DATE(), MAX(b.date), DAY) AS dias_sem_aparecer
FROM `fitflow-ia.fitflow.students` s
LEFT JOIN `fitflow-ia.fitflow.bookings` b ON b.student_id = s.id
LEFT JOIN `fitflow-ia.fitflow.branches` br ON br.id = s.branch_id
GROUP BY s.id, s.source, s.coins_balance, br.name
HAVING dias_sem_aparecer > 14 OR ultimo_agendamento IS NULL
ORDER BY dias_sem_aparecer DESC
LIMIT 100;


-- ── 3. Receita estimada por canal ────────────────────────────
-- Distribuição de alunos por fonte (Wellhub, TotalPass, direto)
SELECT
  COALESCE(s.source, 'direct') AS canal,
  COUNT(DISTINCT s.id) AS alunos,
  ROUND(COUNT(DISTINCT s.id) / SUM(COUNT(DISTINCT s.id)) OVER() * 100, 1) AS pct_alunos,
  COUNT(b.id) AS agendamentos_30d,
  COUNTIF(ck.id IS NOT NULL) AS presencas_30d
FROM `fitflow-ia.fitflow.students` s
LEFT JOIN `fitflow-ia.fitflow.bookings` b
  ON b.student_id = s.id AND b.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
LEFT JOIN `fitflow-ia.fitflow.checkins` ck ON ck.booking_id = b.id
GROUP BY canal
ORDER BY alunos DESC;


-- ── 4. Horários de pico por unidade ─────────────────────────
-- Quais horários concentram mais agendamentos
SELECT
  br.name AS unidade,
  b.time AS horario,
  COUNT(*) AS total_agendamentos,
  COUNTIF(ck.id IS NOT NULL) AS presencas
FROM `fitflow-ia.fitflow.bookings` b
LEFT JOIN `fitflow-ia.fitflow.checkins` ck ON ck.booking_id = b.id
LEFT JOIN `fitflow-ia.fitflow.branches` br ON br.id = b.branch_id
WHERE b.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND b.status != 'CANCELLED'
GROUP BY br.name, b.time
ORDER BY br.name, total_agendamentos DESC;


-- ── 5. Ranking de serviços mais agendados ───────────────────
SELECT
  b.service_name AS servico,
  br.name AS unidade,
  COUNT(*) AS agendamentos,
  COUNTIF(ck.id IS NOT NULL) AS presencas,
  COUNTIF(b.status = 'CANCELLED') AS cancelamentos,
  ROUND(COUNTIF(b.status = 'CANCELLED') / COUNT(*) * 100, 1) AS taxa_cancelamento_pct
FROM `fitflow-ia.fitflow.bookings` b
LEFT JOIN `fitflow-ia.fitflow.checkins` ck ON ck.booking_id = b.id
LEFT JOIN `fitflow-ia.fitflow.branches` br ON br.id = b.branch_id
WHERE b.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY b.service_name, br.name
ORDER BY agendamentos DESC
LIMIT 20;


-- ── 6. Crescimento de alunos novos por semana ───────────────
SELECT
  DATE_TRUNC(s.created_at, WEEK) AS semana,
  COALESCE(s.source, 'direct') AS canal,
  COUNT(*) AS novos_alunos
FROM `fitflow-ia.fitflow.students` s
WHERE s.created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
GROUP BY semana, canal
ORDER BY semana DESC, novos_alunos DESC;
