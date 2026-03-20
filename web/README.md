# FitFlow Suite

**Plataforma completa para Personal Trainers e Studios de Fitness**

Dois produtos modulares que funcionam juntos ou separados:

- **FitFlow Pro** — SaaS de gestão: agendamento, check-in QR, FitCoins, analytics
- **FitBot AI** — Chatbot IA no WhatsApp: atendimento, agendamento e vendas 24h

---

## Stack

| Camada       | Tecnologia                                      |
|-------------|--------------------------------------------------|
| Frontend    | Next.js 15 (App Router), TypeScript, Tailwind v4 |
| UI          | shadcn/ui inspired, Framer Motion, Lucide Icons   |
| Backend     | Supabase (Auth, DB, Realtime, Edge Functions)     |
| ORM         | Prisma 5                                          |
| WhatsApp    | Evolution API (self-hosted, open-source)          |
| IA          | Anthropic Claude API                              |
| Pagamentos  | Stripe + Asaas                                    |
| Parceiros   | Wellhub (Gympass) + TotalPass                     |
| Deploy      | Vercel (app) + Railway/VPS (Evolution API)        |

---

## Setup Local

### Pré-requisitos
- Node.js 18+
- npm/yarn/pnpm
- Conta Supabase (free tier funciona)
- Docker (para Evolution API)

### 1. Clone e instale

```bash
git clone https://github.com/SEU_USER/fitflow-suite.git
cd fitflow-suite/web
npm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 3. Configure o banco de dados

```bash
# Gere o Prisma Client
npx prisma generate

# Push do schema para o Supabase
npx prisma db push

# (Opcional) Visualize o banco
npx prisma studio
```

### 4. Rode o projeto

```bash
npm run dev
# Acesse http://localhost:3000
```

### 5. (Opcional) Suba a Evolution API

```bash
cd docker
docker compose up -d
# Evolution API estará em http://localhost:8080
```

---

## Estrutura do Projeto

```
web/
├── prisma/schema.prisma         # 14 modelos de dados
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, Register, Onboarding
│   │   ├── (dashboard)/         # Área logada
│   │   │   ├── trainer/         # Dashboard + Alunos
│   │   │   ├── student/         # Dashboard do aluno
│   │   │   ├── schedule/        # Agenda com timeline
│   │   │   ├── checkin/         # Check-in QR + manual
│   │   │   ├── coins/           # FitCoins + Recompensas
│   │   │   ├── chatbot/         # Config + teste do FitBot
│   │   │   └── admin/           # Integrações + Config
│   │   └── api/
│   │       ├── bookings/        # CRUD agendamentos
│   │       ├── checkin/         # Check-in + FitCoins
│   │       ├── coins/redeem/    # Resgate de recompensas
│   │       ├── services/        # CRUD serviços
│   │       ├── students/        # CRUD alunos
│   │       ├── rewards/         # CRUD recompensas
│   │       ├── dashboard/stats/ # Analytics em tempo real
│   │       ├── chatbot/test/    # Simulador do FitBot
│   │       └── webhooks/
│   │           ├── whatsapp/    # Evolution API
│   │           ├── wellhub/     # Wellhub (Gympass)
│   │           ├── totalpass/   # TotalPass
│   │           └── stripe/      # Pagamentos
│   ├── chatbot-engine/
│   │   ├── integrations/
│   │   │   ├── claude.ts        # IA com 3 modos
│   │   │   └── evolution.ts     # WhatsApp messaging
│   │   └── orchestrator.ts      # Pipeline completo
│   ├── lib/
│   │   ├── wellhub/client.ts    # Wellhub API client
│   │   ├── totalpass/client.ts  # TotalPass API client
│   │   ├── supabase/            # Auth clients
│   │   ├── prisma.ts            # DB singleton
│   │   └── utils.ts             # Helpers
│   ├── actions/auth.ts          # Server Actions
│   └── middleware.ts            # Auth guard
└── docker/docker-compose.yml    # Evolution API stack
```

---

## Integrações de Parceiros

### Wellhub (Gympass)
- **Check-in Webhook**: recebe notificação quando aluno faz check-in
- **User Status API**: verifica elegibilidade em tempo real
- **Events API**: reporta uso para cálculo de pagamento
- **Booking Webhooks**: booking/cancel/checkin de aulas

Para configurar: Admin → Integrações → Wellhub

### TotalPass
- **Check-in por geolocalização**: aluno faz check-in pelo app (raio 150m)
- **Booking sync**: aulas do FitFlow espelhadas no TotalPass
- **Dois modos**: apenas check-in ou booking + check-in
- **API Key + Integration Code**: obtidos no Portal de Academias

Para configurar: Admin → Integrações → TotalPass

---

## Deploy em Produção

### Vercel (App Principal)

```bash
# Via CLI
npm i -g vercel
vercel --prod

# Ou conecte o repo GitHub no dashboard Vercel
```

**Variáveis de ambiente obrigatórias no Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (com `?pgbouncer=true` na porta 6543)
- `DIRECT_URL` (porta 5432 para migrations)
- `ANTHROPIC_API_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

### Evolution API (Railway)

Uma opção simples: use o template Railway one-click:
https://railway.com/deploy/evolution-api-whatsapp-automation

Ou deploy manual no VPS com o `docker-compose.yml` incluído.

---

## Modelo de Negócio

### FitFlow Pro (SaaS)
| Plano    | Preço    | Recursos                                    |
|----------|----------|---------------------------------------------|
| Starter  | R$ 49/m  | 1 trainer, 30 alunos                        |
| Pro      | R$ 99/m  | 3 trainers, 100 alunos, FitCoins, FitBot básico |
| Business | R$ 199/m | Ilimitado, FitBot completo, Wellhub/TotalPass |

### FitBot AI (standalone)
| Plano      | Preço     | Recursos                        |
|------------|-----------|----------------------------------|
| Basic      | R$ 79/m   | Atendimento, 500 msgs           |
| Pro        | R$ 149/m  | + Agendamento, 2000 msgs        |
| Enterprise | R$ 299/m  | Todos os modos, msgs ilimitadas |

---

## Licença

Proprietário. Todos os direitos reservados.
© 2026 FitFlow Suite
