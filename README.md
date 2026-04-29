# FitFlow Suite

Sistema de gerenciamento para academias e estúdios — agendamento, check-in, FitCoins, relatórios e atendimento via WhatsApp (Laura IA).

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Next.js API Routes + Prisma ORM
- **Banco:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + API Key (agentes externos)
- **Deploy:** Vercel (auto-deploy via `main`)

## Estrutura

```
web/src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── v1/                 # API pública (agentes/Laura)
│   │   │   ├── action/formatted/   # ⭐ Endpoint unificado (texto pronto)
│   │   │   ├── bookings/           # CRUD agendamentos
│   │   │   ├── reports/            # Relatórios (JSON)
│   │   │   └── ...
│   │   ├── admin/              # API admin (painel web)
│   │   └── webhooks/           # Stripe, Wellhub, TotalPass
│   └── (dashboard)/            # Frontend pages
├── lib/                        # Shared utilities
│   ├── prisma.ts               # Prisma client singleton
│   ├── api-auth.ts             # API key verification
│   └── supabase/               # Supabase client
├── components/                 # UI components
└── prisma/
    └── schema.prisma           # Database schema
```

## Ambiente

```bash
# .env.local (desenvolvimento)
DATABASE_URL=postgresql://...        # Supabase pooler (IPv4)
DIRECT_URL=postgresql://...          # Supabase direct (IPv6)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Comandos

```bash
cd web
npm install
npm run dev          # Desenvolvimento (localhost:3000)
npm run build        # Build de produção
npm run start        # Servir build
npx prisma db push   # Sincronizar schema com banco
npx prisma studio    # GUI do banco
```

## API Pública (v1)

Autenticação via header `x-api-key`.

### Endpoint Unificado `/api/v1/action/formatted`

Retorna texto pronto em português para envio via WhatsApp. Usado pela Laura.

| Action | Método | Descrição |
|---|---|---|
| `book` | GET | Criar agendamento + confirmação formatada |
| `cancel` | GET | Cancelar agendamento + confirmação |
| `agenda` | GET | Agenda do dia formatada |
| `availability` | GET | Horários livres formatados |
| `search-student` | GET | Buscar aluno por nome |
| `info-plans` | GET | Modalidades disponíveis |
| `info-professors` | GET | Professores e especialidades |
| `info-hours` | GET | Horário de funcionamento |
| `info-cancellation` | GET | Regras de cancelamento |
| `info-aggregators` | GET | Wellhub, TotalPass, plano direto |
| `info-checkin` | GET | Regras de check-in e FitCoins |
| `coins-balance` | GET | Saldo FitCoins + próximo prêmio |
| `coins-leaderboard` | GET | Ranking FitCoins top 10 |
| `report-demand` | GET | Demanda por horário/professor (admin) |
| `report-general` | GET | Resumo geral do dia (admin) |
| `report-attendance` | GET | Presença e faltas (admin) |

Ver [docs/API.md](docs/API.md) para detalhes completos de cada endpoint.

## Regras de Negócio

- **1 agendamento por dia** por aluno (API bloqueia duplicata)
- **Capacidade:** 22 alunos por horário (Recreio), 28 (Pechincha)
- **Domingos:** estúdio fechado (API bloqueia)
- **Cancelamento:** até 2h antes (após isso conta como falta)
- **Check-in:** feito pelo professor → status COMPLETED + 1 FitCoin
- **Aggregadores:** Wellhub Silver+ e TotalPass TP3+

## Deploy

Push para `main` → Vercel auto-deploy.

URLs:
- **Produção:** https://fitflow-suite.vercel.app
- **Repositório:** https://github.com/Elitj06/fitflow-suite
