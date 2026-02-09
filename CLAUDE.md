# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Set List Creator is a professional setlist creation app for cover bands. It allows musicians to manage songs, build setlists with drag-and-drop, auto-generate setlists using pacing algorithms, and export PDFs.

**Production URL**: https://setlistcreator.co.nz

## Commands

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

npx convex dev       # Start Convex dev server (syncs schema/functions)
npx convex deploy    # Deploy Convex to production
```

Run both `npm run dev` and `npx convex dev` in parallel for local development.

## Architecture

### Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: Convex (serverless database + real-time functions)
- **Auth**: Convex Auth (`@convex-dev/auth`) — Email/Password
- **Payments**: Stripe ($7.95 NZD/month subscription with 14-day free trial)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Drag & Drop**: @dnd-kit for setlist builder
- **PDF Export**: @react-pdf/renderer
- **Email**: Resend

### Data Flow
1. Convex functions defined in `convex/*.ts` (queries and mutations)
2. React hooks in `src/lib/convex.ts` wrap Convex queries/mutations for use in components
3. Components use these hooks directly - no intermediate state management layer

### Database Schema (`convex/schema.ts`)
- **users**: Convex Auth users with Stripe subscription fields (stripeCustomerId, subscriptionStatus, trialEndsAt, etc.)
- **authAccounts, authSessions, authRefreshTokens**: Convex Auth internal tables
- **bands**: Multi-band support with name, slug, and `userId` (owner)
- **songs**: Song library scoped to band with vocal intensity (1-5), energy level (1-5), tags, charts
- **setlists**: Gig setlists with status workflow (draft → finalised → archived)
- **setlistItems**: Junction table linking songs to setlists (with setIndex and position)
- **bandMembers**: Band member contacts for email distribution
- **templates**: Reusable setlist structures with pinned slot support

### Key Patterns

**Convex hooks** use string-based UDF names (works before codegen):
```typescript
const q = (name: string) => name as any;
export function useSongsList(args) {
  return useQuery(q("songs:list"), args);
}
```

**Soft delete**: Records use `archivedAt` timestamp field. Active records have `archivedAt: undefined`.

**Normalization**: Song title/artist are normalized for duplicate detection (`convex/_utils/normalize.ts`).

**Auto-generation**: `src/lib/generation-algorithm.ts` handles smart setlist generation with:
- Vocal pacing (max 2 high-intensity songs in a row)
- Energy curves per set
- Freshness weighting (songs not played recently)
- Tag-based positioning (openers, closers)

### Route Structure
- `/` - Public landing page (with pricing section)
- `/login` - Email/password sign-in/sign-up
- `/subscribe` - Subscription paywall (shown when trial expires)
- `/dashboard` - Band selector or redirect to active band
- `/bands` - Manage bands
- `/[bandSlug]` - Band dashboard
- `/[bandSlug]/songs` - Song library
- `/[bandSlug]/songs/new` - Add song
- `/[bandSlug]/songs/[songId]` - Edit song
- `/[bandSlug]/setlists` - All setlists
- `/[bandSlug]/setlists/new` - Create setlist
- `/[bandSlug]/setlists/[setlistId]` - View setlist
- `/[bandSlug]/setlists/[setlistId]/builder` - Drag-and-drop builder
- `/[bandSlug]/setlists/[setlistId]/export` - Export options
- `/[bandSlug]/members` - Band members
- `/[bandSlug]/templates` - Setlist templates
- `/member-login` - Band member access (separate flow, cookie-based)

### Authentication
- **Primary auth**: Convex Auth (email/password via `@convex-dev/auth`)
- **Providers**: `convex/auth.ts` configures the Password provider
- **Middleware**: `src/middleware.ts` uses `convexAuthNextjsMiddleware` to protect routes
- **Layout**: Root layout wraps with `ConvexAuthNextjsServerProvider`, providers.tsx uses `ConvexAuthNextjsProvider`
- **Band member auth**: Separate cookie-based flow (`clo_member_auth`) for read-only band member access
- All Convex queries/mutations check `getAuthUserId(ctx)` and verify band ownership

### Subscription System
- **Stripe** handles payments: $7.95 NZD/month with 14-day free trial
- **Subscription status** stored on users table: `subscriptionStatus`, `trialEndsAt`, `currentPeriodEnd`
- **`useSubscription` hook** (`src/hooks/useSubscription.ts`) provides `isActive`, `isTrial`, `isExpired`, `daysLeft`
- **Subscription gates** in `dashboard/page.tsx` and `[bandSlug]/layout.tsx` redirect to `/subscribe` when expired
- **Stripe routes**: `/api/stripe/checkout` (create session), `/api/stripe/portal` (manage billing), `/api/stripe/webhook` (handle events)

### Design System
- **Theme**: Light mode with purple-to-blue palette (matching Set List Creator logo)
- **Typography**: DM Sans (body/UI) + DM Mono (code/numbers)
- **Components**: shadcn/ui with custom light theme

## Environment Variables

### .env.local (Next.js)
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL (required)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `NEXT_PUBLIC_SITE_URL` - Site URL for Stripe redirects (defaults to https://setlistcreator.co.nz)
- `STRIPE_SECRET_KEY` - Stripe secret key (server-side)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `RESEND_API_KEY` - For email functionality (optional)

### Convex env (set via `npx convex env set`)
- `SITE_URL` - http://localhost:3000 (dev) / https://setlistcreator.co.nz (prod)

## Setup Notes

### First Time Setup
1. Run `npx convex dev` to initialize Convex and generate types
2. Copy `.env.example` to `.env.local` and fill in values
3. Set Convex env vars: `npx convex env set SITE_URL http://localhost:3000`
4. Run `npm run dev` in a separate terminal

### Build Configuration
- Uses webpack instead of Turbopack (required for @react-pdf/renderer compatibility)
- The `experimental.esmExternals: "loose"` setting generates a warning but is required
- Convex stub types in `convex/_generated/` allow builds before running `convex dev`
