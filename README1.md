# Edeals NP — real backend (Next.js + Supabase + Vercel)

This replaces the single-HTML-file version with a proper site: Next.js hosted
on Vercel, Supabase for the database + image storage + admin login, and
optional order confirmations by email and WhatsApp.

## What's real now vs. before

- Products, orders, and settings live in a real Postgres database (Supabase),
  not browser storage — they persist no matter where or how someone opens
  the site.
- Product photos and payment QR / screenshots are uploaded to Supabase
  Storage, not stuffed into the page as base64.
- `/admin` is password-protected server-side (not just hidden in the page).
- Order confirmations can go out by email and WhatsApp automatically —
  each is optional and the store works fine with neither configured yet.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `products`, `orders`,
   and `store_settings` tables with the right permissions.
3. Go to **Storage** and create three buckets, all set to **public**:
   - `product-images`
   - `payment-proofs`
   - `site-assets`
4. Go to **Project Settings → API** and copy three values — you'll need them
   in step 3 below:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret —
     never put it in a `NEXT_PUBLIC_` variable or client-side code)

## 2. Run it locally (optional, but good for testing first)

```bash
npm install
cp .env.example .env.local   # then fill in the values from step 1
npm run dev
```

Visit `http://localhost:3000` for the store and `http://localhost:3000/admin`
for the admin panel (password = whatever you set `ADMIN_PASSWORD` to).

## 3. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import
   that repo.
3. In **Environment Variables**, add everything from `.env.example` with
   your real values (at minimum: the three Supabase values + `ADMIN_PASSWORD`).
4. Click **Deploy**. Vercel builds and hosts it — you get a live URL, and
   every future `git push` redeploys automatically.
5. Later, add a custom domain under **Project → Settings → Domains**.

## 4. Order confirmation email (optional)

Uses [Resend](https://resend.com) (free tier, no server to run).

1. Sign up, verify a sending domain (or use their test domain while you try
   it out).
2. Create an API key.
3. Add to your environment variables: `RESEND_API_KEY` and `RESEND_FROM`
   (e.g. `Edeals NP <orders@yourdomain.com>`).

Without these two set, orders still save fine — the email step is just
skipped.

## 5. Order confirmation on WhatsApp (optional)

This uses Meta's official WhatsApp Cloud API — there's no way for a website
to send WhatsApp messages without going through Meta.

1. Create an app at [developers.facebook.com](https://developers.facebook.com),
   add the **WhatsApp** product.
2. From **WhatsApp → API Setup**, copy the **Phone number ID** and a
   (long-lived) **access token**.
3. Add to your environment variables: `WHATSAPP_PHONE_NUMBER_ID` and
   `WHATSAPP_ACCESS_TOKEN`.

**One real limitation to know about:** Meta only allows free-form WhatsApp
messages to customers who messaged your business number in the last 24
hours. To message any customer right after checkout, you need a pre-approved
**message template** — create one in Meta Business Manager (a short one like
"Your order {{1}} is confirmed, total {{2}}" is enough), wait for approval
(usually within a day), then set `WHATSAPP_TEMPLATE_NAME` to its name. Until
you do that, WhatsApp confirmations will only reach customers who've
messaged you first — everyone else still gets the email/order record as
normal.

## Customer accounts (required to order)

An account is required to place an order — this uses Supabase's built-in
email/password auth, no extra setup needed beyond your existing Supabase
project. Customers sign in or sign up at `/account`, where they can also see
full order history, download receipts, cancel an order (until it ships),
request a return (after delivery), and message the store about an order.

One setting worth checking: in Supabase → **Authentication → Providers →
Email**, if "Confirm email" is turned on, new customers have to click a
confirmation link before they can sign in. That's fine for a live store; if
you're just testing locally, you can turn it off temporarily so sign-up →
sign-in works immediately.

## Updating an existing database

`supabase/schema.sql` is written to drop and recreate the store's tables from
scratch — it's meant to be run as one complete script, not patched line by
line. If your database gets out of sync after manual changes, the simplest
fix is to re-run the whole file (Supabase → SQL Editor → New query → paste
the whole file → Run). Just note it deletes existing products/orders/reviews
data, so only do this for initial setup or a full reset, not against a live
store with real orders you want to keep.

**If your order history page shows nothing for a signed-in customer**, or
reviews/logo aren't working, it almost always means the database is missing
a table or column this version expects — re-running the full schema fixes it.

## Troubleshooting sign-up

If creating a customer account fails, check in Supabase:
- **Authentication → Providers → Email** is enabled.
- **Authentication → Rate Limits** — a burst of test sign-ups can trip this
  temporarily.
- The exact error text shown on `/account` tells you which of these it is —
  it's passed straight through from Supabase.

- **Products** — add, edit, delete, mark featured / sold out, upload photos.
- **Orders** — see every order with contact details, items, and payment
  proof; update status (pending → confirmed → shipped → delivered, or
  cancelled).
- **Settings** — upload the payment QR code shown at checkout.

## Project structure

```
app/                Next.js pages + API routes (App Router)
  api/products/      product CRUD (admin-only writes)
  api/orders/        place order (public) + list/update (admin)
  api/settings/       store settings (payment QR)
  api/upload/         image uploads to Supabase Storage
  api/admin/           login / logout
  admin/               admin panel route
  page.js              storefront
components/          all UI (storefront + admin)
lib/                 Supabase clients, admin auth check, notification helpers
supabase/schema.sql  run once in the Supabase SQL editor
```
