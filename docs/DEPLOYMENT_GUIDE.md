# 🚀 CashPilot AI — Production Deployment Guide

> **Document Version:** 1.0.0  
> **Target Framework:** Next.js 16 (App Router with `src/proxy.ts`), Prisma 7 (`@prisma/adapter-pg`), Bun Runtime  
> **Deployment Strategies:**
> 1. **Option 1: Vercel (Free MVP Tier)** — $0/month budget for hackathons, demos, and early-stage validation.
> 2. **Option 2: Amazon Web Services (AWS Enterprise Tier)** — Scalable, isolated, SOC2-ready architecture for production workloads.

---

## 📋 Table of Contents

1. [Architectural Overview & Prerequisites](#1-architectural-overview--prerequisites)
2. [Complete Environment Variables Reference](#2-complete-environment-variables-reference)
3. [Option 1: Vercel Deployment (Free MVP Tier)](#3-option-1-vercel-deployment-free-mvp-tier)
   - [3.1 Free Cloud Services Matrix](#31-free-cloud-services-matrix)
   - [3.2 Database Setup (Supabase / Neon)](#32-database-setup-supabase--neon)
   - [3.3 Cache & Rate Limiting Setup (Upstash Redis)](#33-cache--rate-limiting-setup-upstash-redis)
   - [3.4 Background Workers (Inngest Cloud)](#34-background-workers-inngest-cloud)
   - [3.5 Deploying to Vercel](#35-deploying-to-vercel)
   - [3.6 Database Migration & Admin Seeding](#36-database-migration--admin-seeding)
   - [3.7 Telegram Webhook Registration on Vercel](#37-telegram-webhook-registration-on-vercel)
4. [Option 2: AWS Deployment (Enterprise / Production Grade)](#4-option-2-aws-deployment-enterprise--production-grade)
   - [4.1 Enterprise Cloud Architecture](#41-enterprise-cloud-architecture)
   - [4.2 Production Multi-Stage Dockerfile](#42-production-multi-stage-dockerfile)
   - [4.3 Database: AWS RDS for PostgreSQL](#43-database-aws-rds-for-postgresql)
   - [4.4 Container Orchestration: AWS App Runner or ECS Fargate](#44-container-orchestration-aws-app-runner-or-ecs-fargate)
   - [4.5 Networking, SSL (ACM), & Route 53](#45-networking-ssl-acm--route-53)
   - [4.6 Secrets Management (AWS Secrets Manager)](#46-secrets-management-aws-secrets-manager)
   - [4.7 Automated CI/CD Pipeline (GitHub Actions)](#47-automated-cicd-pipeline-github-actions)
5. [Post-Deployment Verification & Smoke Tests](#5-post-deployment-verification--smoke-tests)
6. [Security & Compliance Hardening](#6-security--compliance-hardening)

---

## 1. Architectural Overview & Prerequisites

CashPilot AI relies on a modular, decoupled architecture:
- **Core App:** Next.js 16 (App Router) executing on Node.js / Bun.
- **Request Interception & RBAC:** `src/proxy.ts` (Next.js 16 Edge proxy convention; `middleware.ts` is strictly deprecated).
- **ORM & Data Layer:** Prisma 7 with `@prisma/adapter-pg` connecting to PostgreSQL.
- **Distributed Cache & Rate Limiting:** Upstash Redis / Redis REST API.
- **Asynchronous Execution:** Inngest serverless event queue for heavy OCR document ingestion.
- **Omni-Channel Extension:** Telegram Bot API via `/api/telegram/webhook`.
- **AI Reasoning:** Free-tier LLMs (Google Gemini 1.5 Flash via `@google/generative-ai` and Groq Llama-3 fallback).

---

## 2. Complete Environment Variables Reference

Before deploying to either Vercel or AWS, configure these environment variables:

| Variable Name | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/db?sslmode=require` | PostgreSQL pooling connection string. |
| `BETTER_AUTH_SECRET` | **Yes** | 32+ char random string (e.g. `openssl rand -hex 32`) | Secret encryption key for user sessions. |
| `BETTER_AUTH_URL` | **Yes** | `https://your-domain.com` | Public base URL of your deployed application. |
| `GEMINI_API_KEY` | **Yes** | `AIzaSy...` | Google Gemini 1.5 Flash API Key (Free from AI Studio). |
| `GROQ_API_KEY` | Optional | `gsk_...` | Groq Llama-3 API Key (High-speed free fallback). |
| `UPSTASH_REDIS_REST_URL`| **Yes** | `https://...upstash.io` | Upstash Redis REST endpoint for rate-limiting. |
| `UPSTASH_REDIS_REST_TOKEN`| **Yes** | Secret Token string | Upstash Redis REST bearer token. |
| `INNGEST_EVENT_KEY` | Optional | `...` | Inngest Cloud event key for background job dispatch. |
| `INNGEST_SIGNING_KEY` | Optional | `signkey-...` | Inngest Cloud signing key for secure webhook callbacks. |
| `TELEGRAM_BOT_TOKEN` | Optional | `123456789:ABC...` | Bot token obtained from `@BotFather`. |
| `TELEGRAM_BOT_USERNAME` | Optional | `cashpilot_bot` | Bot username without `@`. |
| `ADMIN_NAME` | Initial | `"System Administrator"` | Name for initial seeded admin user. |
| `ADMIN_EMAIL` | Initial | `"admin@smefinance.com"` | Email for initial seeded admin user. |
| `ADMIN_PASSWORD` | Initial | Secure password | Password for initial seeded admin user. |

---

## 3. Option 1: Vercel Deployment (Free MVP Tier)

This setup costs **$0/month** by leveraging the free tiers of Vercel, Supabase, Upstash, Inngest, and Google AI Studio.

```mermaid
flowchart TD
  subgraph VercelEdge["Vercel Cloud (Free Tier)"]
    Frontend["Next.js 16 Web Dashboard"]
    Proxy["src/proxy.ts (RBAC & Rate Limiting)"]
    API["API Routes & /api/chat"]
    TGRoute["/api/telegram/webhook"]
    InngestRoute["/api/inngest"]
  end

  subgraph ExternalFreeServices["Managed Free-Tier Infrastructure"]
    PrismaCloud[("Prisma Cloud / Prisma Postgres (Free Tier)")]
    Upstash[("Upstash Redis (10,000 req/day Free)")]
    InngestCloud["Inngest Cloud (25,000 runs/mo Free)"]
    Gemini["Google Gemini 1.5 Flash (Free AI Studio)"]
    TGBot["Telegram Bot API"]
  end

  Frontend --> Proxy
  Proxy --> API
  API --> PrismaCloud
  Proxy --> Upstash
  API --> Gemini
  InngestRoute <--> InngestCloud
  TGBot <--> TGRoute
```

### 3.1 Free Cloud Services Matrix
1. **Hosting:** [Vercel](https://vercel.com) (Hobby Plan — Free)
2. **Database:** [Prisma Cloud / Prisma Postgres](https://console.prisma.io) (Free Serverless PostgreSQL with built-in connection pooling) *(Alternative: Supabase or Neon)*
3. **Redis:** [Upstash](https://upstash.com) (Serverless Redis — Free 10,000 requests/day)
4. **Job Queue:** [Inngest Cloud](https://inngest.com) (Free Tier — 25,000 events/month)
5. **AI:** [Google AI Studio](https://aistudio.google.com/) (Gemini 1.5 Flash — Free Tier, 15 RPM)

---

### 3.2 Database Setup: Prisma Cloud (Prisma Postgres)

Because CashPilot AI uses **Prisma 7** with `@prisma/adapter-pg`, deploying with **Prisma Postgres on Prisma Cloud** provides zero-latency connection pooling and optimized serverless performance out of the box.

#### Steps to Set Up Prisma Postgres:
1. Log in to the [Prisma Data Platform / Cloud Console](https://console.prisma.io).
2. Click **New Project** and select **Prisma Postgres** as your database.
3. Choose the region closest to your Vercel deployment (e.g., `US East (N. Virginia)` or `Frankfurt`).
4. Once created, Prisma Cloud will generate your **Connection String**.
5. Copy the connection string. It will look like either:
   - **Prisma Postgres Accelerate URL:**
     ```text
     prisma+postgres://accelerate.prisma-data.net/?api_key=eyJh...
     ```
   - **Direct PostgreSQL URL (with SSL):**
     ```text
     postgres://default:[PASSWORD]@[HOST].prisma-data.net:5432/postgres?sslmode=require
     ```
6. Set this as your `DATABASE_URL` in both your local `.env` and your Vercel Project Environment Variables.

> [!TIP]
> **Why Prisma Cloud is Ideal for Vercel Serverless:**
> Serverless functions (like Vercel and Next.js App Router) open and close database connections frequently, which can exhaust connection pools in traditional databases. Prisma Cloud's built-in connection pooling automatically manages connection multiplexing, so your app will never run out of database connections.

*(Alternative: If using Supabase, navigate to **Project Settings $\rightarrow$ Database** and copy the transaction pooler connection string).*

---

### 3.3 Cache & Rate Limiting Setup (Upstash Redis)
1. Go to [Upstash Console](https://console.upstash.com/) and create a free database named `cashpilot-cache`.
2. Under the **Details** tab, scroll down to the **REST API** section.
3. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

### 3.4 Background Workers (Inngest Cloud)

CashPilot AI delegates failure-prone background tasks (batch OCR invoice extraction, nightly cash forecast rollups, and scheduled alert evaluations) to Inngest via `/api/inngest`.

#### 1. Understanding Inngest Credentials
Inngest requires two distinct keys in production:
- **`INNGEST_SIGNING_KEY`** (`signkey-prod-...`): Secret cryptographic key that secures communication in both directions. Inngest signs all HTTP execution requests sent to your `/api/inngest` route, and your Next.js route uses this key to authenticate sync requests with Inngest Cloud.
- **`INNGEST_EVENT_KEY`** (`key-...`): Authorizes your application code to publish background events (e.g., `inngest.send({ name: "document.uploaded", data: { ... } })`).

---

#### 2. Setup Option A: Automated via Vercel Integration (Recommended)
1. Go to the [Vercel Marketplace: Inngest Integration](https://vercel.com/integrations/inngest) and click **Add Integration**.
2. Select your Vercel account and your CashPilot project.
3. Link your Inngest Cloud account.
4. **Automatic Benefits:**
   - Inngest automatically provisions and sets `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` in your Vercel Environment Variables.
   - Vercel automatically notifies Inngest upon every deployment, triggering zero-touch function auto-discovery.

---

#### 3. Setup Option B: Manual Setup & Dashboard Sync
If you prefer configuring credentials manually:

1. Log in to [Inngest Cloud](https://app.inngest.com/).
2. Select your environment (e.g. **Production**).
3. **Obtain the Signing Key:**
   - Navigate to **Manage** (bottom left) $\rightarrow$ **Signing Key** (or **Environment Settings**).
   - Copy the key starting with `signkey-prod-...`.
4. **Obtain the Event Key:**
   - Navigate to **Manage** $\rightarrow$ **Event Keys**.
   - Copy your default key (or click **Create Event Key**).
5. **Add to Vercel Environment Variables:**
   - In your Vercel Project Dashboard $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**, add:
     - `INNGEST_SIGNING_KEY` = `signkey-prod-...`
     - `INNGEST_EVENT_KEY` = `key-...`
6. **Trigger the First Sync:**
   - Once your Vercel deployment is live, go to Inngest Cloud $\rightarrow$ **Apps** $\rightarrow$ click **Sync app** (or **+ Add App**).
   - Enter your public serve endpoint:
     ```text
     https://<your-vercel-domain>.vercel.app/api/inngest
     ```
   - Click **Sync**. Inngest will send a `PUT` request to `/api/inngest`, verify your signing key, and automatically register your functions:
     - `ocrWorker` (Listens to `document.uploaded`)
     - `recalculateFinancials` (Listens to `financials.recalculate`)
     - `scheduledForecastAlerts` (Runs nightly at midnight UTC)

> [!WARNING]
> **Vercel Deployment Protection Gotcha:**
> If you have **Vercel Authentication / Deployment Protection** enabled on preview deployments, Inngest's sync requests will fail with a `401 Unauthorized` error. To sync preview branches, either disable deployment protection or configure an Inngest bypass protection header in your Vercel project settings.

---

### 3.5 Deploying to Vercel
1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), select **Add New $\rightarrow$ Project** and import your GitHub repository.
3. In **Build and Output Settings**:
   - **Framework Preset:** `Next.js`
   - **Build Command:** `prisma generate && next build` (or leave default since `package.json` already defines this in `build`).
   - **Install Command:** `bun install` or `npm install`.
4. In **Environment Variables**, paste all keys from [Section 2](#2-complete-environment-variables-reference):
   - Set `BETTER_AUTH_URL` to your Vercel domain (e.g. `https://cashpilot-ai.vercel.app`).
   - Generate `BETTER_AUTH_SECRET`:
     ```bash
     bunx -y nanoid 32
     ```
5. Click **Deploy**. Vercel will build the project and output your live production URL.

---

### 3.6 Database Migration & Admin Seeding
Once the build completes on Vercel:
1. From your local development machine with the production `DATABASE_URL` set in your `.env`:
   ```bash
   # Push Prisma schema tables to Prisma Cloud / Prisma Postgres
   bun run db:push

   # Seed the initial System Administrator account
   bun run db:seed
   ```
2. Your database is now populated with all tables and the initial admin user is active!

---

### 3.7 Telegram Webhook Registration on Vercel
Now register your live Vercel URL with Telegram:

Open your web browser and navigate to:
```text
https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<YOUR-VERCEL-DOMAIN>.vercel.app/api/telegram/webhook
```

Telegram will respond:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```
Your Telegram bot is now permanently connected to your live Vercel deployment!

---

## 4. Option 2: AWS Deployment (Enterprise / Production Grade)

For enterprise SMEs, banking integration, and SOC2 compliance, deploy CashPilot AI in a dedicated, isolated AWS Virtual Private Cloud (VPC).

```mermaid
flowchart TD
  Internet([Public Internet & Telegram API]) --> CloudFront[AWS CloudFront / WAF]
  CloudFront --> ALB[Application Load Balancer / ACM SSL]

  subgraph VPC["AWS Virtual Private Cloud (10.0.0.0/16)"]
    subgraph PublicSubnets["Public Subnets"]
      ALB
      NAT[NAT Gateway]
    end

    subgraph PrivateSubnets["Private App Subnets (Fargate / App Runner)"]
      App1["CashPilot Container 1 (Bun / Next.js)"]
      App2["CashPilot Container 2 (Bun / Next.js)"]
    end

    subgraph IsolatedDataSubnets["Isolated Data Subnets (No Internet)"]
      RDS[("Amazon RDS PostgreSQL (Multi-AZ)")]
      ElastiCache[("Amazon ElastiCache Redis")]
    end

    S3[("Amazon S3 (Private Document Vault)")]
  end

  ALB --> App1
  ALB --> App2
  App1 --> RDS
  App2 --> RDS
  App1 --> ElastiCache
  App2 --> ElastiCache
  App1 --> S3
  App2 --> S3
  App1 -.->|Outbound AI calls via NAT| Internet
```

---

### 4.1 Enterprise Cloud Architecture
- **Compute:** AWS App Runner or ECS Fargate (Serverless Docker containers).
- **Database:** Amazon RDS for PostgreSQL 16 (Multi-AZ with automatic failover and read replicas).
- **Networking:** Multi-AZ VPC with public subnets (ALB, NAT Gateway) and private isolated subnets (ECS, RDS).
- **SSL / TLS:** AWS Certificate Manager (ACM) with automated DNS validation via Route 53.
- **Storage:** Amazon S3 with SSE-KMS encryption and IAM pre-signed upload URLs.
- **DDoS & Web Security:** AWS WAF attached to ALB (Rate limiting, SQL injection protection).
- **Secrets:** AWS Secrets Manager with automatic rotation.

---

### 4.2 Production Multi-Stage Dockerfile

Create a production `Dockerfile` in the project root:

```dockerfile
# -----------------------------------------------------------------------------
# Stage 1: Base Dependencies
# -----------------------------------------------------------------------------
FROM oven/bun:1.2-slim AS base
WORKDIR /app

# Install openssl and ca-certificates for Prisma 7 PostgreSQL driver adapter
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Stage 2: Install dependencies
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Builder
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

# Build Next.js application in standalone mode
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN bun run build

# -----------------------------------------------------------------------------
# Stage 4: Production Runner
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged application user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build and public assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

CMD ["bun", "server.js"]
```

> [!NOTE]
> To enable standalone output, ensure `next.config.ts` includes `output: "standalone"`.

---

### 4.3 Database: AWS RDS for PostgreSQL
1. Open the **Amazon RDS Console** $\rightarrow$ **Databases** $\rightarrow$ **Create database**.
2. **Engine:** PostgreSQL (version 16.x).
3. **Templates:** Production (Multi-AZ DB cluster for automatic failover).
4. **DB Instance Class:** `db.m6g.large` (Graviton3 recommended for cost/performance) or `db.t4g.medium` for small business workloads.
5. **Storage:** General Purpose SSD (gp3) with storage autoscaling.
6. **Connectivity:** Place RDS inside private database subnets without public accessibility.
7. **Security Group:** Allow inbound port `5432` **only** from the ECS / App Runner security group.

---

### 4.4 Container Orchestration: AWS App Runner or ECS Fargate

#### Choice A: AWS App Runner (Fastest & Simplest)
1. Open **AWS App Runner** $\rightarrow$ **Create an App Runner service**.
2. **Source:** Container registry (Amazon ECR).
3. Select your repository image tagged `latest`.
4. **Configuration:**
   - **Port:** `3000`
   - **CPU:** 1 vCPU, **Memory:** 2 GB.
5. **Environment Variables:** Map secrets from AWS Secrets Manager.
6. Click **Create & Deploy**. App Runner provisions auto-scaled containers and provides a managed HTTPS URL.

#### Choice B: AWS ECS Fargate (Enterprise VPC Isolation)
1. **ECS Cluster:** Create a cluster in your private VPC.
2. **Task Definition:**
   - Launch type: `FARGATE`.
   - OS Architecture: Linux / ARM64 or X86_64.
   - Container Port: `3000`.
   - Logging: `awslogs` stream to Amazon CloudWatch.
   - Secrets: Inject `DATABASE_URL`, `BETTER_AUTH_SECRET`, etc. from AWS Secrets Manager ARN.
3. **ECS Service:**
   - Desired Tasks: 2 (Minimum for high availability across Availability Zones).
   - Load Balancer: Application Load Balancer (ALB) listening on port 443 with an ACM certificate.
   - Target Group: Port 3000 HTTP with health check path `/api/telegram/webhook` (returns `{ status: "ok" }`).

---

### 4.5 Networking, SSL (ACM), & Route 53
1. **Route 53:** Create a Hosted Zone for your corporate domain (e.g., `cashpilot.yourcompany.com`).
2. **AWS Certificate Manager (ACM):** Request a public SSL certificate for `cashpilot.yourcompany.com`. Validate via Route 53 DNS records.
3. **Application Load Balancer (ALB):**
   - Listener 1: Port `80` $\rightarrow$ Redirect to `HTTPS://443`.
   - Listener 2: Port `443` $\rightarrow$ Attach ACM certificate, forward to ECS Target Group.
4. **Route 53 Alias Record:** Route traffic from `cashpilot.yourcompany.com` to the ALB DNS name.

---

### 4.6 Secrets Management (AWS Secrets Manager)
Store all production credentials securely in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name "cashpilot/production" \
  --description "CashPilot AI Production Secrets" \
  --secret-string file://secrets.json
```

Where `secrets.json` contains:
```json
{
  "DATABASE_URL": "postgresql://dbuser:StrongPass@cashpilot-rds.xyz.us-east-1.rds.amazonaws.com:5432/cashpilot?sslmode=require",
  "BETTER_AUTH_SECRET": "a4f89b6c4e0d2e8f1a7b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f",
  "BETTER_AUTH_URL": "https://cashpilot.yourcompany.com",
  "GEMINI_API_KEY": "AIzaSy...",
  "UPSTASH_REDIS_REST_URL": "https://...",
  "UPSTASH_REDIS_REST_TOKEN": "...",
  "TELEGRAM_BOT_TOKEN": "..."
}
```

Attach an IAM policy granting `secretsmanager:GetSecretValue` to the ECS Execution Role.

---

### 4.7 Automated CI/CD Pipeline (GitHub Actions)

Add `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to Amazon ECS

on:
  push:
    branches: [ "main" ]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: cashpilot-ai
  ECS_SERVICE: cashpilot-service
  ECS_CLUSTER: cashpilot-cluster
  ECS_TASK_DEFINITION: .aws/task-definition.json
  CONTAINER_NAME: cashpilot-app

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun Runtime
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and Push Docker Image
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

---

## 5. Post-Deployment Verification & Smoke Tests

Run these checks immediately after deployment:

### 1. Verify Application Health & Route Interception
```bash
# Verify health response
curl -I https://cashpilot.yourcompany.com/

# Verify Telegram webhook endpoint responds with status ok
curl https://cashpilot.yourcompany.com/api/telegram/webhook
```
*Expected response:*
```json
{"status":"ok","service":"CashPilot AI Telegram Omni-Channel Webhook"}
```

### 2. Verify Database Connection & Admin Login
1. Navigate to `https://cashpilot.yourcompany.com/sign-in`.
2. Enter your seeded admin credentials (`admin@smefinance.com`).
3. Confirm redirection to `/admin`.
4. Try to access an SME URL (e.g., `/dashboard`) $\rightarrow$ Confirm that `src/proxy.ts` strictly blocks the admin and redirects to `/admin` (as per role-isolation rules).

### 3. Verify Telegram Omni-Channel Linking
1. Open `https://cashpilot.yourcompany.com/settings`.
2. Click **Generate Pairing PIN** under the Telegram Card.
3. Open Telegram, send `/link CP-XXXXXX` to your bot.
4. Confirm instant receipt of the welcome greeting.
5. Send `/summary` and check that the numbers match your web dashboard.

---

## 6. Security & Compliance Hardening

1. **HTTPS Only:** Ensure HTTP redirects unconditionally to HTTPS (enforced via ALB Listener rule or Vercel settings).
2. **Cookie Security:** Better Auth sessions are automatically configured with `SameSite=Lax`, `HttpOnly`, and `Secure` attributes over HTTPS.
3. **Database Security:** In AWS, RDS should NEVER reside in public subnets. Keep it isolated and accessible only via ECS security group or AWS SSM Bastion.
4. **Anti-Hallucination Enforced:** All numerical rollups, forecasting calculations, and ledger updates must originate from deterministic service files (`src/services/forecast.ts`, `src/services/alerts.ts`), never raw LLM generation.
5. **Tamper-Evident Audit Logging:** All administrative and financial state transitions are recorded in `AuditLog` table with timestamp, IP, and actor identity.

---

*Document maintained for CashPilot AI (Agentic AI for SME Financial Management).*

