# CashPilot AI: Enterprise System Architecture & Engineering Specification

## 1. Executive Summary & Product Vision

**CashPilot AI** is an enterprise-grade, agentic financial operations platform purpose-built for Small and Medium-sized Enterprises (SMEs). SMEs regularly navigate financial fragmentation across spreadsheets, paper invoices, PDF receipts, bank statements, and messaging channels. Business owners frequently understand top-line revenue but lack visibility into upcoming liquidity deficits, delayed receivables, upcoming operational obligations, and compounding financial risk.

CashPilot AI bridges this gap through an **omni-channel agentic financial copilot** providing:
1. **Deterministic 30-Day Cash-Flow Forecasting** with dynamic scenario and reserve analysis.
2. **Proactive, Rule-Based Financial Risk Alerts** with root-cause attribution.
3. **Multi-Channel Ingestion (Web & Telegram)** with zero-trust validation and OCR extraction.
4. **Actionable Financial Workflows (Invoice Follow-Up Planner)** governed by strict Human-in-the-Loop (HITL) approval gates.
5. **Immutable Activity & Security Audit Logging** recording every analysis, recommendation, draft, and state mutation.

---

## 2. Core Architectural Principles (Senior SWE Mandates)

```mermaid
graph TD
  A[Architectural Principles] --> B[Deterministic Financial Safety]
  A --> C[Unified Omni-Channel Engine]
  A --> D[Zero-Trust Ingestion & Validation]
  A --> E[Human-in-the-Loop Governance]
  A --> F[Immutable Security Auditability]

  B --> B1[No LLM Math / Hallucinations]
  B --> B2[Pure TypeScript Calculation Engines]

  C --> C1[Shared Backend & Tooling for Web & Telegram]
  C --> C2[Single Source of Truth in PostgreSQL]

  D --> D1[Runtime Zod Validation at Boundaries]
  D --> D2[Structured Parsing Reports - No Silent Drops]

  E --> E1[Draft - Review - Explicit Approval]
  E --> E2[Segregation of Read vs Destructive Actions]

  F --> F1[Tamper-Proof Audit Records]
  F --> F2[Complete Actor Attribution]
```

1. **Deterministic Financial Safety (Anti-Hallucination):**
   - Large Language Models (LLMs) are strictly prohibited from performing arithmetic, computing ledger balances, generating cash projections, or assigning risk severity scores via text generation.
   - All financial mathematics, rollups, and alerts originate from verifiable, deterministic TypeScript calculation engines and PostgreSQL queries.
   - The LLM functions exclusively as a natural language intent compiler, tool retrieval orchestrator, and synthesizer of verified tool payloads.
2. **Unified Omni-Channel Core Engine:**
   - Both the Web Application (Next.js 16) and the Telegram Bot interact with the **exact same backend API, business database, financial calculation engines, and LangGraph agent tools**.
   - They never operate as isolated or divergent bots. A transaction uploaded via Telegram instantly recalculates forecasts and updates the Web Dashboard in real time.
3. **Zero-Trust Ingestion & Schema Enforcing:**
   - Every external payload (CSV upload, Telegram document, OCR extraction, webhook) is untrusted until validated through strict Zod schemas.
   - Parsing failures return structured error reports detailing specific invalid rows and columns; invalid records are never silently dropped or assumed.
4. **Human-in-the-Loop (HITL) Action Governance:**
   - Actions are strictly tiered: Read-only operations (auto-approved), internal mutations (e.g., storing validated invoices), and external/consequential operations (e.g., sending payment reminders or supplier notices).
   - Consequential external actions mandate explicit human approval (`PENDING_APPROVAL` $\rightarrow$ `APPROVED`).
5. **Verifiable Audit Trails:**
   - Every agent recommendation, prompt, tool execution, user confirmation, and invoice transition is permanently recorded in an immutable `AuditLog` table with timestamp, actor type, entity ID, and status metadata.

---

## 3. High-Level Omni-Channel System Architecture

```mermaid
flowchart TD
  subgraph PresentationLayer["Presentation & Omni-Channel Channels"]
    WebUI["Next.js 16 Web Dashboard\n(App Router + Tailwind v4 + Shadcn)"]
    WebChat["Copilot Chat Panel\n(Vercel AI SDK + React Hooks)"]
    Dropzone["Financial Ingestion Dropzone\n(CSV & PDF/Image Uploads)"]
    TelegramUser["SME Owner on Telegram\n(Mobile / Desktop App)"]
    TelegramBot["CashPilot Telegram Bot\n(Telegram Bot API Webhook)"]
  end

  subgraph EdgeBoundary["Edge Security & Route Interception (proxy.ts)"]
    Proxy["proxy.ts Network Boundary"]
    SessionValidator{"Better Auth\nSession Check"}
    RoleGuard{"RBAC Guard\n(Admin vs User)"}
    RateLimiter{"Upstash Redis\nSliding Window Limiter"}
  end

  subgraph AppRouter["Next.js 16 Application Runtime (src/app)"]
    AuthEndpoints["/api/auth/[...all]\n(Better Auth Handlers)"]
    ChatEndpoint["/api/chat\n(Streaming Agent Endpoint)"]
    IngestEndpoint["/api/ingest\n(CSV / PDF Ingestion)"]
    TelegramWebhook["/api/telegram/webhook\n(Omni-Channel Handler)"]
    InngestWebhook["/api/inngest\n(Durable Worker Webhook)"]
  end

  subgraph AgenticCore["Agentic Orchestration Layer (LangGraph.js)"]
    IntentClassifier["Intent Compiler &\nStateGraph Orchestrator"]
    ToolRouter["Deterministic Tool Router"]
    GeminiFlash["Google Gemini 1.5 Flash\n(Structured Output Tool Calling)"]
    GroqFallback["Groq Llama-3\n(High-Availability Fallback)"]
  end

  subgraph DeterministicEngines["Deterministic Business & Financial Engines"]
    ForecastEngine["30-Day Cash-Flow Engine\n(Mathematical Projection Model)"]
    AlertEngine["Intelligent Alert Engine\n(Rule Matrix & Severity Scoring)"]
    ActionPlanner["Invoice Follow-up Planner\n(Overdue Prioritization & Drafts)"]
    IngestValidator["Data Ingestion & Normalizer\n(Zod Schemas + Deduplication)"]
  end

  subgraph AsynchronousWorkers["Durable Background Workers (Inngest)"]
    InngestEngine["Inngest Execution Engine"]
    PDFWorker["OCR & Document Understanding Worker"]
    ForecastCron["Nightly 30-Day Recalculation Cron"]
    AlertCron["Continuous Risk Assessment Cron"]
  end

  subgraph DataPersistence["Persistence & State Layer"]
    PrismaAdapter["Prisma 7 ORM Client\n(@prisma/adapter-pg)"]
    SupabasePostgres[("Supabase PostgreSQL\n(Row-Level Isolated DB)")]
    UpstashRedis[("Upstash Redis Store\n(Sessions & Idempotency)")]
  end

  %% Client Routing
  WebUI -->|HTTP / SSE| Proxy
  WebChat -->|Streaming SSE| Proxy
  Dropzone -->|Multipart Form| Proxy
  TelegramUser <-->|Bot Protocol| TelegramBot
  TelegramBot -->|Secure Webhook POST| TelegramWebhook

  %% Proxy Interception
  Proxy --> RateLimiter
  RateLimiter -->|Pass| SessionValidator
  SessionValidator -->|Authenticated| RoleGuard
  RoleGuard --> IngestEndpoint
  RoleGuard --> ChatEndpoint
  Proxy --> AuthEndpoints

  %% Omni-Channel to Agent & Tools
  ChatEndpoint <--> IntentClassifier
  TelegramWebhook <--> IntentClassifier
  TelegramWebhook --> IngestValidator

  %% Ingestion & Background
  IngestEndpoint --> IngestValidator
  IngestValidator -->|Immediate CSV| PrismaAdapter
  IngestValidator -->|Async PDF / Image| InngestWebhook
  InngestWebhook --> InngestEngine
  InngestEngine --> PDFWorker
  InngestEngine --> ForecastCron
  InngestEngine --> AlertCron

  %% Agent Execution
  IntentClassifier <--> ToolRouter
  ToolRouter <--> GeminiFlash
  GeminiFlash -.->|On API Failure| GroqFallback
  ToolRouter --> DeterministicEngines

  %% Engines to Database
  DeterministicEngines --> PrismaAdapter
  PDFWorker --> PrismaAdapter
  ForecastCron --> ForecastEngine
  AlertCron --> AlertEngine

  PrismaAdapter <--> SupabasePostgres
  RateLimiter <--> UpstashRedis
  IntentClassifier <--> UpstashRedis
```

---

## 4. Comprehensive Senior SWE Entity-Relationship Diagram (ERD)

The relational architecture is modeled to support strict multi-tenant isolation, enterprise financial ledgering, omni-channel identity linking, proactive risk telemetry, and auditable human-in-the-loop workflows.

```mermaid
erDiagram
  User ||--o{ Session : "authenticates"
  User ||--o{ Account : "links credentials/OAuth"
  User ||--|| BusinessProfile : "owns financial settings"
  User ||--o{ RecurringSchedule : "defines fixed overhead commitments"
  User ||--o{ TelegramAccount : "links omni-channel identity"
  User ||--o{ Invoice : "owns ledger records"
  User ||--o{ Transaction : "records cash movements"
  User ||--o{ FinancialAlert : "receives risk alerts"
  User ||--o{ ActionDraft : "reviews follow-up drafts"
  User ||--o{ DocumentUpload : "submits ingestion files"
  User ||--o{ AuditLog : "traces actions & mutations"
  User ||--o{ Conversation : "maintains copilot sessions"

  Conversation ||--o{ Message : "contains thread messages"
  Invoice ||--o{ Transaction : "reconciles payments against"
  Invoice ||--o{ ActionDraft : "generates reminder drafts for"
  DocumentUpload ||--o{ Invoice : "extracts structured records into"
  RecurringSchedule ||--o{ Transaction : "generates projected cash outflows for"

  User {
    String id PK "UUID cryptographic primary key"
    String name "Business owner or contact name"
    String email UK "Unique verified corporate email"
    Boolean emailVerified "Email validation flag"
    String image "Avatar URL"
    String role "RBAC: admin | user"
    Boolean banned "Administrative ban status"
    String banReason "Justification for ban"
    DateTime banExpires "Ban expiry timestamp"
    DateTime createdAt "Record creation timestamp"
    DateTime updatedAt "Last modification timestamp"
  }

  BusinessProfile {
    String id PK "UUID"
    String userId FK "Unique 1:1 relation to User"
    String companyName "Registered SME business legal name"
    String currency "Default operational currency (e.g. BDT ৳, USD $)"
    Float openingBalance "Current verified starting cash balance"
    DateTime openingBalanceDate "Date opening balance was established"
    Float minReserveThreshold "Configured minimum safety reserve buffer"
    Int latePaymentAssumptionDays "Conservative delay buffer for receivables"
    Int upcomingPaymentAlertDays "Horizon for supplier payment alerts (default 3 days)"
    Float expenseBaselineMonthly "Historical baseline for unusual expense detection"
    DateTime createdAt "Profile creation timestamp"
    DateTime updatedAt "Last profile update"
  }

  RecurringSchedule {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String title "Schedule name (e.g. Office Rent, Staff Payroll, Bank Loan)"
    String category "RENT | PAYROLL | LOAN_REPAYMENT | UTILITIES | TAX | OTHER"
    Float amount "Scheduled recurring cash commitment"
    String currency "Currency code"
    String frequency "MONTHLY | WEEKLY | BIWEEKLY | QUARTERLY | ANNUALLY"
    Int dayOfMonth "Scheduled execution day (e.g. 1st or 28th)"
    DateTime nextDueDate "Next calculated obligation maturity date"
    Boolean isActive "Active scheduling flag"
    DateTime createdAt "Schedule creation timestamp"
    DateTime updatedAt "Schedule update timestamp"
  }

  Session {
    String id PK "UUID"
    String token UK "Secure session bearer token"
    String userId FK "Indexed relation to User"
    DateTime expiresAt "Absolute session expiry"
    String ipAddress "Client IP address"
    String userAgent "Client browser user agent"
    String impersonatedBy "Admin impersonation tracking ID"
    DateTime createdAt "Session creation timestamp"
    DateTime updatedAt "Session update timestamp"
  }

  Account {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String providerId "Auth provider identifier (credentials, etc.)"
    String accountId "External or local account reference"
    String password "Bcrypt/Argon2 hashed credential string"
    String accessToken "Provider token"
    String refreshToken "Provider refresh token"
    DateTime accessTokenExpiresAt "Token expiration"
    DateTime refreshTokenExpiresAt "Refresh expiration"
    String scope "OAuth scopes"
    String idToken "OIDC ID token"
    DateTime createdAt "Creation timestamp"
    DateTime updatedAt "Update timestamp"
  }

  Verification {
    String id PK "UUID"
    String identifier "Target email or phone verification identifier"
    String value "Hashed verification token or OTP secret"
    DateTime expiresAt "Absolute token expiration timestamp"
    DateTime createdAt "Record creation timestamp"
    DateTime updatedAt "Last modification timestamp"
  }

  TelegramAccount {
    String id PK "UUID"
    String userId FK "Unique 1:1 relation to User"
    String telegramUserId UK "Telegram unique numeric user ID"
    String telegramUsername "Telegram handle (@username)"
    String chatId "Active conversation chat ID"
    String linkToken "One-time cryptographically secure verification PIN"
    DateTime linkTokenExpiresAt "Expiry for pairing PIN (15 min window)"
    Boolean isVerified "Channel authorization status"
    DateTime linkedAt "Timestamp when linking was verified"
    DateTime createdAt "Creation timestamp"
    DateTime updatedAt "Update timestamp"
  }

  Invoice {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String invoiceNumber "Unique business invoice code (e.g. INV-2026-001)"
    String counterparty "Customer name (AR) or Supplier name (AP)"
    String counterpartyEmail "Customer or supplier billing email"
    String counterpartyPhone "Customer or supplier contact phone"
    String type "RECEIVABLE (incoming) | PAYABLE (outgoing)"
    Float totalAmount "Total gross invoiced liability"
    Float paidAmount "Cumulative settled amount (handles partial payments)"
    Float remainingAmount "Outstanding balance (indexed for queries)"
    String currency "Transaction ISO currency code"
    DateTime issueDate "Invoice creation/billing date"
    DateTime dueDate "Agreed settlement due date"
    String status "PENDING | PARTIALLY_PAID | OVERDUE | PAID | CANCELLED"
    String source "WEB_CSV | WEB_UPLOAD | TELEGRAM | MANUAL"
    String documentUploadId FK "Optional FK linking to source document"
    DateTime lastReminderSentAt "Timestamp of most recent customer reminder"
    DateTime createdAt "Creation timestamp"
    DateTime updatedAt "Update timestamp"
  }

  Transaction {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String invoiceId FK "Optional FK linking transaction to Invoice"
    String recurringScheduleId FK "Optional FK linking to RecurringSchedule"
    String type "INFLOW (cash in) | OUTFLOW (cash out)"
    String category "CUSTOMER_RECEIPT | SUPPLIER_PAYMENT | RENT | PAYROLL | LOAN | TAX | OTHER"
    Float amount "Absolute cash movement value"
    String currency "Transaction currency"
    DateTime transactionDate "Execution or scheduled transaction date"
    String description "Clear ledger narrative description"
    Boolean isProjected "True if future expectation, False if verified bank entry"
    DateTime createdAt "Creation timestamp"
    DateTime updatedAt "Update timestamp"
  }

  FinancialAlert {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String title "Succinct descriptive alert title"
    String description "Comprehensive root-cause explanation"
    String severity "LOW | MEDIUM | HIGH | CRITICAL"
    String category "CASH_DEFICIT | BELOW_RESERVE | OVERDUE_RECEIVABLE | UPCOMING_PAYABLE | UNUSUAL_EXPENSE"
    Float impactAmount "Estimated total financial liability or shortfall"
    DateTime relevantDate "Date when event triggers or matures"
    String status "ACTIVE | ACKNOWLEDGED | RESOLVED | DISMISSED"
    String suggestedAction "Specific next operational action"
    Json supportingData "Structured JSON payload of driving invoices/transactions"
    DateTime resolvedAt "Timestamp when risk was resolved"
    DateTime createdAt "Creation timestamp"
    DateTime updatedAt "Update timestamp"
  }

  ActionDraft {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String invoiceId FK "Target invoice relation"
    String actionType "INVOICE_REMINDER | SUPPLIER_PAYMENT_SCHEDULE | EXPENSE_DISPUTE"
    String channel "EMAIL | TELEGRAM | SMS"
    String recipientName "Customer contact name"
    String recipientContact "Target email, phone, or Telegram chat identifier"
    String subject "Message subject header"
    String content "Generated reminder or communication copy"
    String status "DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | SENT | FAILED"
    String approvedBy "User ID who granted explicit approval"
    DateTime approvedAt "Approval grant timestamp"
    DateTime executedAt "Dispatch or delivery timestamp"
    String dispatchError "Error explanation if delivery failed"
    DateTime createdAt "Creation timestamp"
    DateTime updatedAt "Update timestamp"
  }

  DocumentUpload {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String fileName "Original filename"
    String fileType "CSV | PDF | IMAGE"
    String fileUrl "Encrypted storage URI / path"
    String source "WEB | TELEGRAM"
    String telegramFileId "Telegram remote file ID if received via bot"
    String status "PENDING | PROCESSING | EXTRACTED | NEEDS_CONFIRMATION | CONFIRMED | FAILED"
    Float confidenceScore "OCR / extraction confidence score (0.00 - 1.00)"
    Json extractedData "Normalized JSON extraction payload"
    Json errorReport "Validation errors breakdown by row and column"
    DateTime createdAt "Creation timestamp"
    DateTime updatedAt "Update timestamp"
  }

  AuditLog {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String actor "USER | AGENT | SYSTEM | TELEGRAM"
    String actionType "INGESTION | FORECAST_RUN | ALERT_TRIGGER | DRAFT_CREATED | DRAFT_APPROVED | DISPATCH"
    String entityType "Invoice | Transaction | ActionDraft | FinancialAlert | BusinessProfile"
    String entityId "Target entity UUID"
    Json details "Structured mutation metadata and state delta"
    String status "SUCCESS | FAILED | PENDING_APPROVAL"
    String ipAddress "Origin IP address"
    DateTime createdAt "Immutable event timestamp"
  }

  Conversation {
    String id PK "UUID"
    String userId FK "Indexed relation to User"
    String channel "WEB | TELEGRAM"
    String title "Summary conversation title"
    Json workflowState "Active multi-step workflow context and temporary intent memory"
    DateTime createdAt "Session start"
    DateTime updatedAt "Last message timestamp"
  }

  Message {
    String id PK "UUID"
    String conversationId FK "Indexed relation to Conversation"
    String sender "USER | ASSISTANT | SYSTEM"
    String content "Text response or query"
    Json toolCalls "Array of invoked tool names and parameters"
    Json toolResults "Array of verified tool execution outputs"
    DateTime createdAt "Message timestamp"
  }
```

### 4.1 Better Auth Integration Architecture & Merging Strategy

The ERD is specifically engineered to merge seamlessly with **Better Auth** using a zero-friction, modular architecture:

```mermaid
flowchart TD
  subgraph BetterAuthBoundary["Better Auth Managed Boundary (Prisma Adapter)"]
    User["User Model\n(Identity, Profile & additionalFields)"]
    Session["Session Model\n(Tokens, Expirations, impersonatedBy)"]
    Account["Account Model\n(Credentials, Hashes, OAuth tokens)"]
    Verification["Verification Model\n(Email confirmation & OTPs)"]
    
    User -->|1:N| Session
    User -->|1:N| Account
  end

  subgraph DomainBoundary["CashPilot Financial Domain (Prisma Relations)"]
    Invoice["Invoice Ledger (AR / AP)"]
    Transaction["Cash Movements (Inflows/Outflows)"]
    Alert["Financial Alerts (Risk Engine)"]
    ActionDraft["Action Drafts (HITL Planner)"]
    DocUpload["Document Uploads (CSV/PDF OCR)"]
    AuditLog["Audit Log (Security Compliance)"]
    Telegram["Telegram Account (Omni-Channel Link)"]
    Chat["Conversation & Messages (Copilot State)"]
  end

  User -->|userId FK| Invoice
  User -->|userId FK| Transaction
  User -->|userId FK| Alert
  User -->|userId FK| ActionDraft
  User -->|userId FK| DocUpload
  User -->|userId FK| AuditLog
  User -->|userId FK| Telegram
  User -->|userId FK| Chat
```

#### How the Schema Coexists with Better Auth:

1. **Zero-Conflict Table Segregation:**
   - Better Auth's `@better-auth/prisma-adapter` strictly queries and manages its core quartet: `User`, `Session`, `Account`, and `Verification`.
   - Domain tables (`Invoice`, `Transaction`, `FinancialAlert`, `ActionDraft`, `DocumentUpload`, `AuditLog`, `TelegramAccount`, `Conversation`, `Message`) link to `User.id` via standard PostgreSQL foreign keys (`userId`). Better Auth ignores these domain tables, while Prisma enforces cascade deletion and referential integrity.

2. **Custom SME Fields via Better Auth's `user.additionalFields`:**
   - Rather than requiring an extra join to a separate settings table, business-critical settings (`companyName`, `currency`, `openingBalance`, `minReserveThreshold`, `latePaymentAssumptionDays`) are declared in `src/lib/auth.ts` under `user.additionalFields`.
   - **Performance Benefit:** Better Auth automatically includes these fields inside `session.user` returned by `useSession()` on the client and `auth.api.getSession()` on the server. The entire dashboard receives the SME's currency symbol (`৳` or `$`), opening balance, and reserve threshold without issuing secondary database round-trips.

3. **Admin Plugin Integration:**
   - Better Auth's official `admin` plugin extends `User` with `role`, `banned`, `banReason`, and `banExpires`, and `Session` with `impersonatedBy`.
   - The route interception proxy (`src/proxy.ts`) reads `session.user.role` directly to enforce role-based access control (RBAC), routing admins to `/admin` and regular users to `/dashboard`.

4. **Omni-Channel Telegram Identity Bridge:**
   - The `TelegramAccount` entity stores the mapping between a verified `telegramUserId` and the Better Auth `User.id`.
   - When a user interacts with the Telegram bot (e.g., uploading an invoice PDF or requesting a forecast), the Telegram webhook resolves the user's `userId` via `TelegramAccount` and passes this identical context to the financial calculation engines and LangGraph agent tools. Both Web and Telegram share the exact same user identity, database records, and permissions.

---

## 5. Detailed Feature Specifications

### Feature 1: AI Financial Data Analyzer (Ingestion & Normalization)

```mermaid
sequenceDiagram
  autonumber
  actor User as SME Owner (Web or Telegram)
  participant IngestAPI as /api/ingest & Telegram Webhook
  participant Validator as Zod Ingestion Normalizer
  participant OCRWorker as Inngest OCR Worker (PDF/Image)
  participant DB as Supabase PostgreSQL
  participant Calc as Recalculation Trigger

  User->>IngestAPI: Upload CSV or Document (PDF / Image)
  alt CSV Upload
    IngestAPI->>Validator: Stream parse via PapaParse & validate schema
    alt Invalid Schema / Incomplete Rows
      Validator-->>User: Return structured error report (Row, Field, Reason)
    else Schema Valid & Clean
      Validator->>DB: Store normalized Invoices & Transactions (Deduplicated)
      Validator->>Calc: Trigger metric, forecast & alert refresh
      Calc-->>User: Success response with ingestion summary
    end
  else PDF or Image Ingestion
    IngestAPI->>DB: Create DocumentUpload record (Status: PROCESSING)
    IngestAPI->>OCRWorker: Dispatch async Inngest background job
    OCRWorker->>OCRWorker: Run Node-native OCR & Document Extractor
    alt High Confidence (> 0.85)
      OCRWorker->>DB: Save Invoices directly & mark COMPLETED
      OCRWorker->>Calc: Trigger metric & forecast refresh
      OCRWorker-->>User: Notification with extracted figures
    else Low Confidence (Needs Review)
      OCRWorker->>DB: Save extractedData & mark NEEDS_CONFIRMATION
      OCRWorker-->>User: Prompt for review & user confirmation
    end
  end
```

- **Predefined CSV Schema:**
  - Mandatory fields: `date` (YYYY-MM-DD), `description`, `amount` (float $> 0$), `type` (`RECEIVABLE` | `PAYABLE` | `EXPENSE`), `counterparty` (Customer or Supplier).
  - Optional fields: `invoiceNumber`, `dueDate`, `paymentStatus` (`PENDING`, `PAID`, `PARTIALLY_PAID`).
- **Validation & Deduplication Logic:**
  - Date normalization to UTC ISO strings.
  - Currency normalization and rounding to 2 decimal places.
  - Deduplication key: `hash(userId, invoiceNumber, counterparty, totalAmount)`.
  - Rejection policy: Fail closed. Never silently omit inconsistent data.

---

### Feature 2: Cash-Flow Forecasting Engine (30-Day Projection)

The forecasting engine operates purely mathematically to prevent financial hallucinations:

$$\text{Projected Balance}(t) = \text{Balance}(t-1) + \text{Inflows}(t) - \text{Outflows}(t)$$

Where:
- $\text{Balance}(0) = \text{Opening Verified Cash Balance}$.
- $\text{Inflows}(t) = \sum \text{Customer Receivables due on day } (t - \Delta_{\text{delay}})$.
  - $\Delta_{\text{delay}} = \text{Conservative late payment assumption days configured by user}$.
- $\text{Outflows}(t) = \sum \text{Supplier Payables due on day } t + \text{Scheduled Recurring Expenses (Rent, Payroll, Loan Repayments)}$.

```mermaid
flowchart TD
  Start([Start 30-Day Forecast Engine]) --> OpenBal[1. Fetch Current Verified Cash Balance]
  OpenBal --> FetchAR[2. Retrieve Accounts Receivable with Due Dates]
  FetchAR --> ApplyLate[3. Apply Conservative Late Delay: DueDate + DeltaDays]
  ApplyLate --> FetchAP[4. Retrieve Accounts Payable & Fixed Overhead Schedules]
  FetchAP --> LoopDays[5. Compute Daily Balance for t = 1 to 30]

  LoopDays --> CheckReserve{"Is Daily Balance < Minimum Reserve?"}
  CheckReserve -->|Yes| FlagDeficit[Record Projected Reserve Shortfall Date & Amount]
  CheckReserve -->|No| CheckNegative{"Is Daily Balance < 0?"}

  CheckNegative -->|Yes| FlagNegative[Record Critical Cash Deficit Date & Amount]
  CheckNegative -->|No| NextDay[Advance to Day t + 1]

  FlagDeficit --> NextDay
  FlagNegative --> NextDay
  NextDay --> CheckDone{"t == 30?"}
  CheckDone -->|No| LoopDays
  CheckDone -->|Yes| Summary[Synthesize Metrics: Min Balance, Lowest Date, Inflows, Outflows]
  Summary --> End([Return Deterministic Forecast Payload])
```

- **Scenario Modeling (Affordability Simulation):**
  - Copilot supports what-if scenarios (e.g., *"Can I afford to purchase ৳200,000 of inventory on Day 5?"*).
  - The engine injects a simulated outflow into day $t_k$, recalculates all 30 days, and checks if minimum cash reserve is violated on any subsequent day.

---

### Feature 3: Intelligent Financial Alerts Engine

A rule-based, deterministic engine detecting operational and liquidity hazards without relying on generative LLM heuristics.

```mermaid
flowchart LR
  subgraph AlertRules["Deterministic Alert Evaluator"]
    R1["Rule 1: Projected Negative Cash Balance"]
    R2["Rule 2: Balance Falls Below Safety Reserve"]
    R3["Rule 3: Overdue Customer Invoices"]
    R4["Rule 4: Large Supplier Payment Due <= 48 Hours"]
    R5["Rule 5: Unusual Expense vs Historical Baseline"]
  end

  subgraph SeverityEngine["Deterministic Severity Matrix"]
    Crit["CRITICAL: Projected Deficit or Immediate Solvency Risk"]
    High["HIGH: Overdue Receivables > 14 Days OR Reserve Breach"]
    Med["MEDIUM: Supplier Payment Due Tomorrow OR Overdue < 7 Days"]
    Low["LOW: Routine Advisory OR Approaching Reserve Buffer"]
  end

  R1 --> Crit
  R2 --> High
  R3 --> High
  R4 --> Med
  R5 --> Low
```

- **Alert Data Contract:**
  Each generated alert contains:
  1. `title`: Concise title (e.g., *"Projected Cash Deficit in 8 Days"*).
  2. `severity`: Deterministically assigned enum.
  3. `relevantDate`: Target milestone date.
  4. `impactAmount`: Exact numerical financial impact.
  5. `supportingData`: JSON array of driving invoice IDs, counterparties, and payment amounts.
  6. `suggestedAction`: Deterministic recommended procedure.

---

### Feature 4: Agentic Financial Copilot & Omni-Channel Orchestration

The AI Copilot operates as a **LangGraph StateGraph** connecting to explicit backend functions:

```mermaid
stateDiagram-v2
  [*] --> IdleState : Await User Prompt (Web or Telegram)
  IdleState --> IntentAnalysis : Ingest & Sanitize Input
  IntentAnalysis --> ToolSelection : Match Intent to Financial Tools
  ToolSelection --> ExecuteDeterministicTool : Invoke Tool (get_financial_summary, forecast_cash_balance, etc.)
  ExecuteDeterministicTool --> EvaluateResults : Evaluate Tool Output Data
  EvaluateResults --> MultiStepRequired : Need Secondary Lookup?
  MultiStepRequired --> ToolSelection : Yes, fetch complementary records
  MultiStepRequired --> FormulateResponse : No, synthesize natural language explanation
  FormulateResponse --> CheckActionRequired : Requires Business Action?
  CheckActionRequired --> PresentAnswer : Read-only or advisory query
  CheckActionRequired --> StageActionDraft : Prepares follow-up (create_reminder_draft)
  StageActionDraft --> AwaitUserApproval : Gate action as PENDING_APPROVAL
  AwaitUserApproval --> LogAudit : Record action & status
  PresentAnswer --> LogAudit : Record query & response
  LogAudit --> [*]
```

#### Deterministic Tool Specifications (Mandatory Backend Functions)

| Tool Identifier | Input Parameters | Output Payload | Purpose |
| :--- | :--- | :--- | :--- |
| `get_financial_summary` | `{ userId: string }` | `{ currentBalance, totalReceivables, totalPayables, minProjectedBalance, activeAlertsCount }` | Fetches real-time financial overview metrics. |
| `get_invoices` | `{ userId, type?, status?, counterparty?, limit? }` | `Invoice[]` | Searches invoices with filtering and pagination. |
| `get_upcoming_payables` | `{ userId, daysHorizon: number }` | `Transaction[] & Invoice[]` | Retrieves scheduled supplier obligations within $N$ days. |
| `get_upcoming_receivables` | `{ userId, daysHorizon: number }` | `Invoice[]` | Retrieves scheduled customer receipts within $N$ days. |
| `forecast_cash_balance` | `{ userId, days: 30, hypotheticalExpense?: { amount, date } }` | `{ dailyBalances, minBalance, minBalanceDate, breachesReserve }` | Runs deterministic 30-day projection & scenario testing. |
| `get_financial_alerts` | `{ userId, severity?: string }` | `FinancialAlert[]` | Retrieves active risks with supporting evidence. |
| `create_reminder_draft` | `{ userId, invoiceId: string, tone?: string }` | `{ draftId, recipient, subject, content, status: "DRAFT" }` | Formulates an overdue invoice follow-up draft using verified data. |
| `record_action_status` | `{ draftId: string, status: "APPROVED" \| "REJECTED" }` | `{ success: boolean, updatedStatus: string }` | Records user's explicit approval or rejection of a draft. |

---

### Feature 5: Invoice Follow-up & Action Planner

```mermaid
flowchart TD
  OverdueScan[Scan Invoices: Status == OVERDUE or PENDING with DueDate < Today] --> ScoreEngine
  
  subgraph ScoreEngine["Prioritization Scoring Function"]
    Score["Score = (Days Overdue * 1.5) + (Amount / 10,000 * 2.0) + (Shortfall Urgency Weight)"]
  end

  ScoreEngine --> PrioritizedList[Sort Invoices by Priority Score Descending]
  PrioritizedList --> DraftGen[LLM Draft Generator: Ingests Verified Invoice Data Only]
  DraftGen --> GateApproval{"Human-in-the-Loop Approval"}

  GateApproval -->|User Edits or Approves| Approved[Status: APPROVED]
  GateApproval -->|User Rejects| Rejected[Status: REJECTED]

  Approved --> DispatchAction[Dispatch via Configured Channel: Email / Telegram]
  DispatchAction --> AuditRecord[Record Execution in AuditLog & Update Invoice.lastReminderSentAt]
  Rejected --> AuditRecord
```

- **Anti-Hallucination Guardrail in Draft Generation:**
  - The LLM prompt is injected **exclusively** with verified invoice database records: `customerName`, `invoiceNumber`, `remainingAmount`, `originalDueDate`.
  - The model system instruction strictly prevents fabricating contract terms, bank routing numbers, or interest penalties.

---

### Feature 6: Activity & Security Audit Log (Enterprise Compliance)

To satisfy enterprise financial and banking standards, CashPilot AI maintains an append-only, tamper-evident audit record:
- **Captured Event Metadata:**
  - `actor`: `USER` (via Web UI), `AGENT` (autonomous recommendation), `SYSTEM` (cron job), `TELEGRAM` (via Bot).
  - `actionType`: `INGESTION`, `FORECAST_RUN`, `ALERT_DETECTED`, `DRAFT_CREATED`, `DRAFT_APPROVED`, `DRAFT_DISPATCHED`.
  - `entityId`: Reference UUID of the altered or generated entity.
  - `details`: JSON payload snapshot capturing state before and after mutation.
  - `ipAddress` & `createdAt`: Network origin and immutable UTC timestamp.

---

## 6. Omni-Channel Architecture: Telegram Bot & Web Integration

The Telegram Bot is an omnichannel extension sharing the identical execution context:

```mermaid
flowchart LR
  subgraph TelegramClient["Telegram User"]
    TUser["SME Owner"]
  end

  subgraph TelegramInfrastructure["Telegram Cloud"]
    TBotAPI["Telegram Bot API"]
  end

  subgraph CashPilotBackend["CashPilot Backend (Next.js 16)"]
    WebhookRoute["/api/telegram/webhook"]
    AuthMapper{"Link Telegram ID\nto User Account"}
    UnifiedAgent["LangGraph Agent Execution Engine"]
    SharedTools["Deterministic Financial Tools & Prisma 7"]
  end

  TUser -->|Send /forecast or PDF Invoice| TBotAPI
  TBotAPI -->|Webhook POST payload| WebhookRoute
  WebhookRoute --> AuthMapper
  AuthMapper -->|Resolved User Context| UnifiedAgent
  UnifiedAgent <--> SharedTools
  SharedTools -->|Formatted Markdown & Charts| WebhookRoute
  WebhookRoute -->|Send Message / File| TBotAPI
  TBotAPI -->|Render in Chat| TUser
```

- **Telegram Authentication & Account Linking:**
  1. A user logs into the Web Dashboard and navigates to **Settings $\rightarrow$ Connect Telegram**.
  2. The system generates a cryptographic 6-digit one-time PIN (e.g. `CP-884213`) stored in `TelegramAccount` with a 15-minute expiry.
  3. The user opens the CashPilot Telegram Bot and enters `/link CP-884213`.
  4. The webhook verifies the PIN, associates `telegramUserId` and `chatId` with the user's `userId`, and marks `isVerified = true`.
  5. Subsequent commands and file uploads automatically resolve the authenticated business user context.

---

## 7. Implementation Roadmap & Technical Milestones

```mermaid
gantt
  title CashPilot AI Implementation Roadmap
  dateFormat  YYYY-MM-DD
  section Phase 1: Foundation & Auth
  Prisma 7 & Better Auth Admin Plugin       :done, p1_1, 2026-10-10, 2026-10-12
  proxy.ts RBAC & Route Interception        :done, p1_2, 2026-10-12, 2026-10-13
  TanStack Form & Toast Feedback Integration:done, p1_3, 2026-10-13, 2026-10-14
  section Phase 2: Schema & Ingestion
  Update Prisma Schema with CashPilot Models:active, p2_1, 2026-10-14, 2026-10-15
  CSV Parsing & Zod Normalization API       :p2_2, 2026-10-15, 2026-10-16
  PDF/Image Extraction Worker (Inngest)     :p2_3, 2026-10-16, 2026-10-17
  section Phase 3: Financial Engines
  Deterministic 30-Day Forecasting Engine   :p3_1, 2026-10-17, 2026-10-18
  Intelligent Rule-Based Alert System       :p3_2, 2026-10-18, 2026-10-19
  section Phase 4: Agentic Copilot & Webhook
  LangGraph Multi-Step StateGraph           :p4_1, 2026-10-19, 2026-10-21
  Telegram Bot Webhook & Shared Tooling     :p4_2, 2026-10-21, 2026-10-22
  Invoice Reminder Planner & HITL Approval  :p4_3, 2026-10-22, 2026-10-23
  section Phase 5: UI & Hardening
  6-Section Enterprise Dashboard UI         :p5_1, 2026-10-23, 2026-10-24
  Audit Logging & Production Hardening      :p5_2, 2026-10-24, 2026-10-25
```
