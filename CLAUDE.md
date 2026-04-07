# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Sürüm Yönetimi

Sürüm artışı **sadece "push at" veya "deploy" komutunda** yapılır, her commit'te değil.

Sürüm artışı için değişikliğin **3. taraf kullanıcıyı (son kullanıcıyı) etkilemesi** gerekir. Aşağıdaki değişiklikler sürüm **almaz**:
- Sadece geliştirici araçlarına, script'lere, e-posta şablonlarına (son kullanıcıya gönderilmeyenler) dokunan değişiklikler
- CI/CD, deployment, altyapı, ortam değişkeni değişiklikleri
- Kod kalitesi, refactoring, yorum, dokümantasyon değişiklikleri

Aşağıdaki değişiklikler sürüm **alır**:
- Kullanıcının gördüğü UI'daki bug fix veya iyileştirmeler
- Yeni kullanıcı özelliği veya ekran
- Kullanıcıyı etkileyen davranış değişikliği

| Değişiklik türü | Artış | Örnek |
|-----------------|-------|-------|
| UI bug fix, küçük görsel iyileştirme | **patch** | 1.0.1 → 1.0.2 |
| Yeni kullanıcı özelliği (geriye dönük uyumlu) | **minor** | 1.0.1 → 1.1.0 |
| Kırıcı değişiklik, büyük yeniden yapılanma | **major** | 1.0.1 → 2.0.0 |

Push'taki birden fazla commit arasında en yüksek seviyeyi kullan.
`src/app/changelog/page.tsx` dosyasındaki `changelog` dizisine de yeni sürüm girdisini ekle.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # ESLint check
```

Database migrations are managed via Supabase CLI:
```bash
npx supabase migration new <name>   # Create new migration
npx supabase db push                # Push migrations to Supabase
```

## Architecture Overview

**Turkish accounting SaaS** (muhasebe = accounting) with multi-tenant organization support.

### Tech Stack
- **Next.js 16.2.1** with App Router, **React 19**
- **Supabase** — auth + PostgreSQL database (Row Level Security enforced)
- **Drizzle ORM** — schema definition only (`src/lib/db/schema.ts`); actual queries use the Supabase JS client directly
- **Google Gemini AI** — OCR for receipt scanning (`src/lib/ai/ocr.ts`)
- **Resend** — transactional email for invitations (`src/lib/email/`)
- **Zustand** — global auth state (`src/stores/auth-store.ts`)
- **shadcn/ui** + Tailwind CSS v4 — UI components in `src/components/ui/`
- **react-hook-form** + **Zod** — form validation (`src/lib/validations/`)

### Route Structure

```
src/app/
  (auth)/         — login, register, invite (unauthenticated)
  (dashboard)/    — main app (requires auth + organization)
    accounts/     — chart of accounts
    bank/         — bank accounts & transactions
    contacts/     — customers & suppliers
    invoices/     — sales & purchase invoices
    receipts/     — receipt scanning with OCR
    reports/      — financial reports
    settings/     — organization & member settings
    transactions/ — income/expense/transfer entries
  api/
    ocr/          — Gemini OCR endpoint
    bank/         — bank integration
    exchange-rates/ — TCMB currency rates
    invoices/     — invoice PDF generation
```

### Data Flow

1. **Auth**: Supabase Auth → session managed by middleware (`middleware.ts` → `src/lib/supabase/middleware.ts`). Use `src/lib/supabase/server.ts` in Server Components/Actions, `src/lib/supabase/client.ts` in Client Components.

2. **Server Actions** in `src/lib/actions/` — all data mutations go through `"use server"` functions that call Supabase directly. No API routes for CRUD; API routes are only for file processing (OCR) and external data fetching.

3. **Multi-tenancy**: Every DB table has `organization_id`. The active organization is stored in `useAuthStore` (Zustand). Always pass `orgId` from the store to server actions.

4. **Schema**: Drizzle schema in `src/lib/db/schema.ts` is the source of truth for table structure. Changes require a new Supabase migration file in `supabase/migrations/`.

### Key Patterns

- Server Actions return plain objects (not Response); errors are returned as `{ error: string }`, not thrown.
- Supabase RLS policies enforce data isolation — server actions should not add extra `organization_id` checks beyond what RLS handles, but they do for clarity.
- OCR flow: camera/upload → `/api/ocr` → Gemini Vision → parsed JSON stored in `receipts.ocr_parsed_data`.
- Exchange rates are fetched from TCMB (Turkish Central Bank) and cached in the `exchange_rates` table.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY
RESEND_API_KEY
```
