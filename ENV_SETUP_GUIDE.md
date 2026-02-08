# Environment Variables Setup Guide

## 1. Google Cloud Console

**URL**: https://console.cloud.google.com

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth Client ID**
3. Application type: **Web application**
4. Name: `Set List Creator`
5. Authorised JavaScript origins:
   - `http://localhost:3000` (dev)
   - `https://setlistcreator.co.nz` (prod)
6. Authorised redirect URIs:
   - Your Convex HTTP Actions URL + `/api/auth/callback/google`
   - e.g. `https://<your-deployment>.convex.site/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**

You will get:
```
AUTH_GOOGLE_ID=<your-google-client-id>
AUTH_GOOGLE_SECRET=<your-google-client-secret>
```

---

## 2. Stripe Dashboard

**URL**: https://dashboard.stripe.com

### API Keys
1. Go to **Developers → API Keys**
2. Copy the **Publishable key** (starts with `pk_`)
3. Copy the **Secret key** (starts with `sk_`)

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### Webhook
1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://setlistcreator.co.nz/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 3. Convex Dashboard

**URL**: https://dashboard.convex.dev

Set these via the CLI or in **Settings → Environment Variables**:

```bash
npx convex env set SITE_URL https://setlistcreator.co.nz
npx convex env set AUTH_GOOGLE_ID <your-google-client-id>
npx convex env set AUTH_GOOGLE_SECRET <your-google-client-secret>
```

| Variable | Value |
|----------|-------|
| `SITE_URL` | `https://setlistcreator.co.nz` (prod) or `http://localhost:3000` (dev) |
| `AUTH_GOOGLE_ID` | From Google Cloud Console (step 1) |
| `AUTH_GOOGLE_SECRET` | From Google Cloud Console (step 1) |

---

## 4. Vercel (or your hosting provider)

**URL**: https://vercel.com → Project → Settings → Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://<your-deployment>.convex.cloud` | From Convex dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | From Stripe (step 2) |
| `NEXT_PUBLIC_SITE_URL` | `https://setlistcreator.co.nz` | Used for Stripe redirect URLs |
| `STRIPE_SECRET_KEY` | `sk_live_...` | From Stripe (step 2) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Stripe webhook (step 2) |
| `RESEND_API_KEY` | `re_...` | Optional, for email features |

---

## 5. Local Development (.env.local)

Copy `.env.example` to `.env.local` and fill in:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site URL (local)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional
RESEND_API_KEY=re_...
```

For local Stripe webhook testing, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
This will give you a local `whsec_...` signing secret to use in dev.

For local Convex env vars:
```bash
npx convex env set SITE_URL http://localhost:3000
npx convex env set AUTH_GOOGLE_ID <your-test-google-client-id>
npx convex env set AUTH_GOOGLE_SECRET <your-test-google-client-secret>
```

---

## Quick Reference

| Variable | Where to set | Source |
|----------|-------------|--------|
| `AUTH_GOOGLE_ID` | Convex | Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | Convex | Google Cloud Console |
| `SITE_URL` | Convex | Your domain |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel + .env.local | Convex dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel + .env.local | Stripe dashboard |
| `NEXT_PUBLIC_SITE_URL` | Vercel + .env.local | Your domain |
| `STRIPE_SECRET_KEY` | Vercel + .env.local | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Vercel + .env.local | Stripe webhooks |
| `RESEND_API_KEY` | Vercel + .env.local | Resend dashboard |
