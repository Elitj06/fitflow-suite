# API Reference — FitFlow Suite v1

Base URL: `https://fitflow-suite.vercel.app`
Auth: Header `x-api-key: <key>`

---

## `/api/v1/action/formatted` — Endpoint Unificado

Retorna `{ action, text, requiresModelFollowup? }`. Campo `text` já formatado em PT-BR para WhatsApp.

### `action=book`

Cria agendamento e retorna confirmação formatada.

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `studentId` | string | ✅ | ID do aluno (via `search-student`) |
| `name` | string | ✅ | Nome completo do aluno |
| `date` | string | ✅ | Data `YYYY-MM-DD` (BRT) |
| `time` | string | ✅ | Horário `HH:MM` (BRT) |
| `serviceId` | string | ❌ | Default: Musculação |

**Erros tratados:**
- Data inválida ou domingo → texto explicativo
- Aluno já tem agendamento no dia → mostra horário existente
- Professor lotado → sugere outro horário
- Aluno não encontrado → texto de erro

**Lógica interna:**
1. Valida data (não domingo)
2. Verifica duplicata (1/dia/aluno)
3. Busca trainers disponíveis em paralelo (`Promise.all`)
4. Aloca primeiro trainer com capacidade
5. Cria booking com status `CONFIRMED`, source `WHATSAPP`
6. Converte BRT→UTC para armazenamento (`brtToUtc`)

---

### `action=cancel`

Cancela agendamento existente.

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `bookingId` | string | ✅ | ID do agendamento |
| `name` | string | ❌ | Nome do aluno (para mensagem) |

**Regras:**
- Se < 2h do horário → warning de possível falta
- Se horário já passou → avisa que aula foi contabilizada
- Status `COMPLETED` não pode ser cancelado
- Status `CANCELLED` → avisa que já está cancelado

---

### `action=agenda`

Lista agendamentos de um dia.

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `date` | string | ❌ | `YYYY-MM-DD` (default: hoje) |

**Retorna:** Lista com ícone de status (✅ completado, 🔵 pendente), horário, aluno e professor.

---

### `action=availability`

Horários livres de um dia.

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `date` | string | ❌ | `YYYY-MM-DD` (default: hoje) |

**Lógica:** Gera todos os slots do dia (seg-sex: 06-21, sáb: 08-12), subtrai horários com bookings.

---

### `action=search-student`

Busca aluno por nome (case-insensitive, contains).

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | ✅ | Nome ou parte do nome |

**Retorna:**
- 0 resultados → "não encontrado"
- 1 resultado → mostra nome + studentId
- 2-5 resultados → lista numerada + `requiresModelFollowup: true`

---

## Info Actions

Todas retornam texto informativo fixo (config em `lib/constants.ts`).

| Action | Param | Origem dos dados |
|---|---|---|
| `info-plans` | nenhum | Banco (services) |
| `info-professors` | nenhum | Banco (profiles role=TRAINER) |
| `info-hours` | nenhum | `STUDIO_CONFIG` |
| `info-cancellation` | nenhum | `STUDIO_CONFIG` |
| `info-aggregators` | nenhum | `STUDIO_CONFIG` |
| `info-checkin` | nenhum | `STUDIO_CONFIG` |

---

## FitCoins

### `action=coins-balance`

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `studentId` | string | ✅ | ID do aluno |

**Retorna:** Saldo atual + próximo prêmio alcançável (do catálogo `rewards`) + quantos coins faltam + total de check-ins.

### `action=coins-leaderboard`

Sem params. Top 10 alunos por `coinsBalance`.

---

## Reports (admin only)

### `action=report-demand`

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `month` | string | ❌ | `YYYY-MM` (default: mês atual) |

### `action=report-general`

Sem params. Snapshot do dia.

### `action=report-attendance`

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `period` | string | ❌ | `week` ou `month` (default: month) |

---

## Outros Endpoints v1

### `GET /api/v1/bookings`
Listar agendamentos. Params: `date`, `phone`.

### `POST /api/v1/bookings`
Criar agendamento (retorna JSON com `confirmationMessage`).
Body: `{ studentId, name, serviceId, date, time }`

### `DELETE /api/v1/bookings/:id`
Cancelar agendamento.

### `GET /api/v1/check-date?date=YYYY-MM-DD`
Validar data. Retorna `{ isOpen, dayName, validSlots }`.

### `GET /api/v1/students?search=Nome`
Buscar alunos. 10 resultados.

### `GET /api/v1/trainers`
Listar professores.

### `GET /api/v1/availability`
Horários livres nos próximos 7 dias.

---

## Arquitetura — Action Formatted

```
route.ts                    → Router + auth (dispatchAction)
├── actions/booking.ts      → bookAction, cancelAction, agendaAction, availabilityAction, searchStudentAction
├── actions/info.ts         → infoPlans*, infoProfessors*, infoHours*, infoCancellation*, infoAggregators*, infoCheckin*
├── actions/coins.ts        → coinsBalanceAction, coinsLeaderboardAction
├── actions/reports.ts      → reportDemandAction, reportGeneralAction, reportAttendanceAction
└── lib/constants.ts        → Types (ActionResult), helpers (parseDate, brtToUtc, fmt*), STUDIO_CONFIG
```

**Convenção:**
- Cada action é uma função async que recebe `(orgId, params)` e retorna `ActionResult`
- `requiresModelFollowup: true` = modelo precisa interagir com usuário (ex: múltiplos resultados)
- Toda formatação de texto acontece nas actions, não no router
- Helpers BRT centralizados em `lib/constants.ts`
