/**
 * FitFlow → BigQuery Export
 * Roda diariamente via cron (00:30 BRT)
 * Exporta dados do dia anterior do Supabase para o BigQuery
 *
 * Uso: npx tsx scripts/export-to-bigquery.ts [--full] [--date YYYY-MM-DD]
 *   --full   : reexporta tudo (não só ontem)
 *   --date   : data específica (padrão: ontem)
 */

import { PrismaClient } from "@prisma/client";
import { BigQuery } from "@google-cloud/bigquery";
import * as path from "path";

const prisma = new PrismaClient();

const PROJECT_ID = "fitflow-ia";
const DATASET_ID = "fitflow";
const SA_FILE = path.resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    "/root/.openclaw/workspace/credentials/google-service-account.json"
);

const bigquery = new BigQuery({ projectId: PROJECT_ID, keyFilename: SA_FILE });

// ── helpers ────────────────────────────────────────────────────────────────

function getDateRange(args: string[]): { from: Date; to: Date } {
  const fullIndex = args.indexOf("--full");
  if (fullIndex !== -1) {
    return { from: new Date("2024-01-01"), to: new Date() };
  }

  const dateIndex = args.indexOf("--date");
  if (dateIndex !== -1 && args[dateIndex + 1]) {
    const d = new Date(args[dateIndex + 1]);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    return { from: d, to: end };
  }

  // Padrão: ontem
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { from: yesterday, to: today };
}

async function upsertRows(
  tableId: string,
  rows: Record<string, unknown>[],
  idField = "id"
) {
  if (rows.length === 0) {
    console.log(`  ${tableId}: nenhum dado novo`);
    return;
  }

  const table = bigquery.dataset(DATASET_ID).table(tableId);

  // BigQuery não tem upsert nativo — apaga as linhas existentes pelo ID e reinsere
  const ids = rows.map((r) => `'${r[idField]}'`).join(",");
  await bigquery.query(
    `DELETE FROM \`${PROJECT_ID}.${DATASET_ID}.${tableId}\` WHERE ${idField} IN (${ids})`
  );

  await table.insert(rows, { skipInvalidRows: false, ignoreUnknownValues: false });
  console.log(`  ✅ ${tableId}: ${rows.length} linhas inseridas`);
}

// ── exporters ──────────────────────────────────────────────────────────────

async function exportBookings(from: Date, to: Date) {
  const data = await prisma.booking.findMany({
    where: { updatedAt: { gte: from, lt: to } },
    include: { service: { select: { name: true } } },
  });

  const rows = data.map((b) => ({
    id: b.id,
    org_id: b.orgId ?? null,
    branch_id: b.branchId ?? null,
    student_id: b.studentId ?? null,
    service_id: b.serviceId ?? null,
    service_name: (b as any).service?.name ?? null,
    date: b.date ? b.date.toISOString().split("T")[0] : null,
    time: b.time ?? null,
    status: b.status ?? null,
    source: (b as any).source ?? null,
    created_at: b.createdAt?.toISOString() ?? null,
    updated_at: b.updatedAt?.toISOString() ?? null,
  }));

  await upsertRows("bookings", rows);
}

async function exportCheckins(from: Date, to: Date) {
  const data = await prisma.checkin.findMany({
    where: { createdAt: { gte: from, lt: to } },
  });

  const rows = data.map((c) => ({
    id: c.id,
    booking_id: c.bookingId ?? null,
    student_id: c.studentId ?? null,
    org_id: c.orgId ?? null,
    branch_id: c.branchId ?? null,
    checked_at: c.createdAt?.toISOString() ?? null,
    source: c.method ?? null,
  }));

  await upsertRows("checkins", rows);
}

async function exportStudents() {
  // Alunos: exporta todos (sem dados PII — só IDs e métricas)
  const data = await prisma.profile.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      orgId: true,
      branchId: true,
      source: true,
      coinsBalance: true,
      createdAt: true,
    },
  });

  const rows = data.map((s) => ({
    id: s.id,
    org_id: s.orgId ?? null,
    branch_id: s.branchId ?? null,
    source: s.source ?? "direct",
    coins_balance: s.coinsBalance ?? 0,
    created_at: s.createdAt?.toISOString() ?? null,
  }));

  await upsertRows("students", rows);
}

async function exportBranches() {
  const data = await prisma.branch.findMany({
    select: { id: true, orgId: true, name: true, createdAt: true },
  });

  const rows = data.map((b) => ({
    id: b.id,
    org_id: b.orgId ?? null,
    name: b.name ?? null,
    created_at: b.createdAt?.toISOString() ?? null,
  }));

  await upsertRows("branches", rows);
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const { from, to } = getDateRange(args);

  console.log(`\n🚀 FitFlow → BigQuery Export`);
  console.log(`   Período: ${from.toISOString().split("T")[0]} → ${to.toISOString().split("T")[0]}`);
  console.log(`   Projeto: ${PROJECT_ID}.${DATASET_ID}\n`);

  await exportBookings(from, to);
  await exportCheckins(from, to);
  await exportStudents();
  await exportBranches();

  console.log("\n✅ Export concluído\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro no export:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
