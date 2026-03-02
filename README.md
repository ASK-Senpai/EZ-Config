# EZConfig

EZConfig is a full-stack PC build analysis platform built with Next.js App Router. It combines a deterministic hardware engine (Engine v12), Firestore-backed persistence, and AI-assisted reporting to help users build, evaluate, optimize, and track PC configurations with strict server-side enforcement for premium features.

# Overview

This project exists to solve a practical problem in PC building: choosing components is easy, validating a balanced and future-proof system is not. EZConfig provides a deterministic analysis pipeline for compatibility, scoring, bottlenecks, power, and market timing, then layers AI explanations and long-form technical reports on top.

The system is split into a pure engine layer and a server layer:
- Engine layer: deterministic math and compatibility logic only
- Server layer: auth, Firestore, caching, report generation, and premium enforcement

# Architecture

## Frontend (Next.js App Router)
- Built on `next@16.1.6` with App Router.
- UI routes include landing, builder, dashboard, compare, insights, and technical report pages.
- Protected experiences are grouped under `src/app/(protected)` with both middleware and server-side auth checks.

## State Management (Zustand)
- Builder state is managed in `src/store/useBuildStore.ts`.
- Persisted key: `ez-config-build` in `localStorage`.
- Stores selected components and exposes `setBuild`, `resetBuild`, and per-component setters.

## Backend (Next.js API Routes)
- API routes under `src/app/api/**` handle auth, build CRUD, AI explain/report, optimization, compare, payments, and cron jobs.
- Server-only Firebase Admin usage is isolated in `src/server/**`.

## Database (Firestore)
- Core collections used by runtime:
  - `users`
  - `builds`
  - `components/{type}/items`
  - `build_reports`
  - `analysisCache`, `aiAnalysisCache`
  - `analytics`, `analytics_users`
- Build records store component IDs; API routes hydrate full documents before analysis.

## AI Layer (Groq)
- Report generator: `src/server/ai/generateTechnicalReport.ts`
- Model: `llama-3.3-70b-versatile`
- Strict JSON response mode with parse validation and one strict retry path.
- Quick explain endpoints use AI summarization for saved builds.

## Deterministic Engine
- Engine entry points:
  - `runEngineV12` in `src/lib/engine/index.ts`
  - `analyzeBuild` in `src/lib/engine/analyzeBuild.ts`
- Engine version constant: `src/lib/engine/constants.ts` (`v12`).
- Includes:
  - normalized scoring
  - compatibility checks
  - bottleneck detection
  - power estimation and recommended PSU
  - FPS estimation
  - market timing
  - optimization hints

## Caching Layer
- Deterministic analysis cache in `src/server/analysis/analysisCache.ts` keyed by component IDs + engine version.
- Build technical report cache in `build_reports` keyed by build ID + `engineSnapshotHash`.
- In-memory memo cache helpers for lightweight AI responses in `src/lib/ai/memo.ts`.

## Premium Feature System
- Central feature flags: `src/lib/featureFlags.ts`.
- Plan source of truth: `users/{uid}.plan`.
- Premium checks are enforced server-side in API routes (not UI-only).

# Core Features

- PC Builder with live component selection and persisted local state
- Compatibility validation (socket, platform, power envelope, etc.)
- Deterministic performance scoring (`gaming`, `workstation`, `futureProof`, `overall`)
- FPS estimation via engine outputs
- Power analysis with `totalTDP`, `recommendedPSU`, provided wattage, and headroom
- Dashboard for saved builds (load, delete, share, explain, optimize, report)
- AI Quick Analysis modal for build-level insights
- Full Technical Report generation and viewing
- Deterministic premium optimization engine (budget-constrained)
- Market Insights system:
  - `/insights/gpu-market`
  - `/insights/cpu-market`
- Premium gating for optimization/compare/advanced features via feature flags and backend checks

# AI System

## Quick Analysis
- Endpoint: `/api/ai/explain/[id]`
- Produces structured short explanation JSON for a saved build.
- Works on hydrated build input derived from Firestore component documents.

## Full Technical Report
- Endpoint: `POST /api/ai/generate-build-report/[id]`
- Flow:
  1. Auth + ownership check
  2. Hydrate full build input
  3. Run `analyzeBuild`
  4. Compute `engineSnapshotHash`
  5. Return cached report if hash matches existing record
  6. Otherwise generate JSON report via Groq and persist

## Guardrails
- Validator: `src/server/ai/validateReport.ts`
- Rejects:
  - forbidden filler phrases
  - numeric hallucinations not present in input payload
- Report generation performs:
  - strict JSON parse
  - validation pass
  - one strict retry if validation fails

# Data Flow

User -> Builder UI -> Zustand build state -> API route
-> Firestore component hydration -> Engine v12 (`analyzeBuild`)
-> optional cache lookup/store -> AI report/summary generation
-> persisted build/report documents -> Dashboard/Report UI

# Folder Structure

```text
src/
  app/
    (protected)/
      dashboard/
      compare/
      build-report/[reportId]/
      upgrade/
    api/
      ai/
      auth/
      build/
      payment/
      cron/
      search/
    builder/
    insights/
      gpu-market/
      cpu-market/
  components/
    builder/
    features/
    product/
    ui/
  lib/
    engine/
    ai/
    featureFlags.ts
    data/
    products/
    insights/
  server/
    ai/
    analysis/
    auth/
    firebase/
    firestore/
    insights/
    products/
    utils/
  store/
    useBuildStore.ts
```

# Technology Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Firebase (client SDK)
- Firebase Admin SDK (server-side auth + Firestore)
- Zustand (persisted builder state)
- Groq SDK
- Tailwind CSS + custom UI primitives (shadcn-style patterns)
- Radix UI primitives
- Framer Motion
- Recharts
- Razorpay (subscription/payment routes)

# Installation

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Production build:

```bash
npm run build
npm run start
```

# Environment Variables

Create `.env.local` (or `.env`) from `.env.example`.

Required keys:

- Firebase client:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- Firebase admin:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- AI:
  - `GROQ_API_KEY`
- Payments:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
  - `RAZORPAY_PLAN_ID`
- Internal jobs/security:
  - `CRON_SECRET`

# Future Improvements

- Integrate broader benchmark datasets for workload-specific scoring calibration
- Add automated test coverage for engine invariants and API authorization paths
- Add CI/CD with lint, type-check, and route-level integration tests
- Extend report validator with schema-level field constraints and section completeness checks
- Expand optimization constraints to include thermal/acoustic targets and regional price variance

# License

No license is currently defined in this repository. Add a `LICENSE` file before public distribution.