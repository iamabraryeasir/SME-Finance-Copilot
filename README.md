# CashPilot AI: Agentic AI for SME Financial Management

[![Next.js 16](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![Prisma 7](https://img.shields.io/badge/Prisma-7.10.x-blue?logo=prisma)](https://www.prisma.io/)
[![Bun](https://img.shields.io/badge/Runtime-Bun-fbf0df?logo=bun)](https://bun.sh/)
[![Better Auth](https://img.shields.io/badge/Auth-Better_Auth-success)](https://www.better-auth.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

**CashPilot AI** is an enterprise-grade, agentic financial operations platform built for Small and Medium-sized Enterprises (SMEs). It connects fragmented business financial records (invoices, spreadsheets, PDFs, receipts, and bank transactions) with deterministic cash-flow forecasting engines, proactive rule-based risk alerts, a multi-turn AI Copilot, and human-in-the-loop follow-up action workflows.

---

## 🌟 Key Features

### 1. Multi-Channel Financial Data Ingestion (Web & Telegram)
- **CSV Ingestion:** Ingest accounts receivable (AR) and accounts payable (AP) via web dropzone with strict schema validation and normalization.
- **Document OCR:** Extract invoices from PDFs and receipt images via web upload and direct Telegram bot file forwarding.
- **Fail-Closed Validation:** Runtime Zod schema enforcement produces comprehensive error reports without silently discarding data.
- **Automatic Recalculation:** Trigger real-time metric, forecast, and risk updates on successful file ingestion.

### 2. Deterministic 30-Day Cash-Flow Forecasting
- **Mathematical Modeling:** Pure deterministic arithmetic ensures the LLM never hallucinates ledger totals.
- **Reserve Monitoring:** Flag projected dates where cash balances dip below the user-configured minimum safety reserve.
- **Conservative Delay Modeling:** Incorporate configurable late customer payment buffers.
- **What-If Scenario Simulation:** Test business affordability queries (e.g. *"Can I afford to purchase ৳200,000 of inventory on Day 5?"*).

### 3. Intelligent Financial Alerts Engine
- **Rule-Based Risk Matrix:** Real-time detection of projected cash deficits, overdue customer invoices, and upcoming large supplier obligations.
- **Deterministic Severity Scoring:** Objective severity classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with supporting transaction attribution.
- **Actionable Guidance:** Prescriptive operational recommendations paired with each alert.

### 4. Agentic Financial Copilot (LangGraph.js)
- **Multi-Turn StateGraph:** Intent analysis, multi-step tool coordination, and natural language synthesis.
- **Strict Anti-Hallucination Guardrails:** AI functions as an orchestrator over 8 verified backend tools.
- **Shared Omni-Channel Context:** Identical backend intelligence and database powering both the Web Dashboard chat and the Telegram Bot.

### 5. Invoice Follow-up & Action Planner (Human-in-the-Loop)
- **Prioritization Scoring:** Rank overdue receivables by days past due, outstanding balance, and cash deficit urgency.
- **Factual Reminder Drafting:** Generate professional reminder copy strictly populated with verified database records.
- **Strict Approval Gate:** Mandate explicit user review, edit, and confirmation before dispatching customer communications.

### 6. Activity & Security Audit Log
- **Immutable Audit Trail:** Append-only logging of all agent analyses, recommendations, approval states, and data mutations.
- **Role-Based Access Control (RBAC):** Stateful session protection via `src/proxy.ts` segregating standard users and platform administrators.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale / Constraints |
| :--- | :--- | :--- |
| **Runtime & Package Manager** | [Bun](https://bun.sh/) | Exclusive runtime (`bun add`, `bun run`, `bunx`). |
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, Server Components, edge protection via `src/proxy.ts`. |
| **Authentication** | [Better Auth](https://www.better-auth.com/) | Stateful session management, Prisma adapter, Admin plugin. |
| **Database & ORM** | [Prisma 7](https://www.prisma.io/) + PostgreSQL | Stable 7.10.x, `@prisma/adapter-pg` driver adapter, Supabase PostgreSQL. |
| **Agent Orchestration** | [LangGraph.js](https://langchain-ai.github.io/langgraphjs/) | Multi-step state machine with deterministic tool calling. |
| **AI Streaming** | [Vercel AI SDK](https://sdk.vercel.ai/) | `@ai-sdk/langchain` adapter with streaming chat UI. |
| **Form Management** | [TanStack Form](https://tanstack.com/form) | Strictly validated with runtime [Zod](https://zod.dev/) schemas. |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) | Accessible, design-token driven components. |
| **Toasts & Feedback** | [react-hot-toast](https://react-hot-toast.com/) | Mounted at top-right for all form and action states. |
| **LLM Providers (Free Tier)** | Google Gemini 1.5 Flash / Groq | Zero-cost tier constraints. Paid APIs (OpenAI/Anthropic) are prohibited. |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Bun](https://bun.sh/) (v1.2+ recommended)
- PostgreSQL database (e.g. Supabase instance)

### 2. Environment Configuration
Copy `.env.example` to `.env` and provide your credentials:

```bash
# Database
DATABASE_URL="postgres://user:password@host:5432/postgres?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="your-secure-random-32-character-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Initial Admin Seeding Credentials
ADMIN_NAME="System Administrator"
ADMIN_EMAIL="admin@smefinance.com"
ADMIN_PASSWORD="AdminSecurePassword123!"

# Free-Tier AI Providers
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"

# Telegram Bot (Optional for Bot Integration)
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
```

### 3. Installation & Database Setup

```bash
# Install dependencies using Bun
bun install

# Push database schema to PostgreSQL
bun run db:push

# Seed the administrator account
bun run db:seed

# Start development server
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the landing page, register a user, or sign in.

---

## 📜 Development Scripts

- `bun run dev`: Start Next.js development server with Turbopack.
- `bun run build`: Generate Prisma client and create optimized production build.
- `bun run lint`: Run Biome linter across all source files.
- `bun run format`: Run Biome code formatter.
- `bun run db:push`: Push Prisma schema directly to PostgreSQL.
- `bun run db:seed`: Seed or verify administrator account.

---

## 🔒 Security & Architecture Directives

For detailed architectural guidelines, state machine diagrams, entity relationship schemas, and design specifications:
- [PROJECT_ARCHITECTURE.md](docs/PROJECT_ARCHITECTURE.md)
- [DESIGN.md](docs/DESIGN.md)
- [AGENTS.md](AGENTS.md)
