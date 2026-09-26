# Auto Supply POS & Inventory

Point of Sale and inventory system for auto parts retailers.
React + Vite + TypeScript + Tailwind on the front, Supabase (Postgres) on the back.

## Features

- **POS terminal** — keyboard-first cashier screen, barcode scanner support, search by SKU / part name / brand / vehicle (e.g. "Vios NCP93"), line and cart discounts, Cash / GCash / Card, change calculation, 80mm thermal receipt printing.
- **Atomic checkout** — one Postgres function (`process_checkout`) records the sale, its items, and deducts stock in a single transaction with row locks. Prices are re-read on the server, so the client can't tamper with them. If any item is short on stock, nothing is saved.
- **Inventory** — paginated, sortable table with In Stock / Low Stock / Out of Stock badges, receive-stock and stock-adjustment forms, and a full audit history per product.
- **Reports** (admin) — revenue today / this month, transaction counts, low-stock alerts, fast-moving items, daily revenue chart.
- **Roles** — `admin` and `cashier`. The first account created is admin; everyone after is cashier.
- **Live updates** — stock changes from other terminals appear instantly via Supabase Realtime.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste all of `supabase/migrations/001_schema.sql`, and run it.
3. (Optional) Run `supabase/seed.sql` for sample categories, parts, and customers.
4. For quick local testing, go to **Authentication → Providers → Email** and turn off "Confirm email".

### 2. App

```bash
npm install
cp .env.example .env      # then paste your Project URL and anon key
npm run dev
```

Open http://localhost:5173 and create your first account — it becomes the admin.

### 3. Adding cashiers

Have each cashier sign up from the login screen. They get the `cashier` role automatically.
To promote someone to admin, run in the SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'someone@example.com');
```

## Keyboard shortcuts (POS)

| Key | Action |
| --- | --- |
| F2 | Focus search |
| ↑ / ↓ | Move selection in results |
| Enter | Add selected item |
| Esc | Clear search |
| F12 (or F9) | Open checkout |
| Alt+1 / 2 / 3 | Cash / GCash / Card (in checkout) |
| Enter | Complete sale (in checkout) |

A barcode scanner in keyboard mode works anywhere on the POS screen — no need to click the search box.

## Project structure

```
supabase/
  migrations/001_schema.sql   tables, indexes, RLS, RPCs (checkout, stock adjust, search, reports)
  seed.sql                    sample data
src/
  types/                      database.types.ts + domain models
  lib/                        supabase client, formatting helpers
  store/cartStore.ts          Zustand cart (persisted) + totals math
  hooks/                      React Query hooks, barcode scanner, realtime
  context/AuthContext.tsx     session + profile/role
  components/
    pos/                      ProductGrid, CartPanel, CustomerPicker, CheckoutModal, Receipt
    inventory/                StockAdjustModal, ProductFormModal, StockHistoryModal
    ui/                       Modal, StockBadge
    layout/AppLayout.tsx      nav with low-stock badge
  pages/                      POS, Inventory, Dashboard, Login
```

## Design notes

- **Pricing is VAT-inclusive** (12%, PH). The receipt breaks out VATable sales and VAT. Change the rate in `process_checkout` (`v_vat_rate`) and `VITE_VAT_RATE` together.
- **Stock can't be edited directly.** Column-level grants block `UPDATE` on `stock_quantity`; every change goes through `process_checkout` or `adjust_stock`, which writes to `inventory_logs`.
- **Deadlock-safe checkout.** Rows are locked in `product_id` order, so two terminals selling overlapping items can't deadlock.
- **Invoice numbers** look like `INV-20260926-0042` and restart daily (Manila time). They come from a row-locked counter instead of a sequence, so a failed or cancelled checkout never skips a number — the series stays gapless.
- Receipt layout is for 80mm paper. For 58mm, change `@page` and `#print-root` width in `src/index.css`.
- Regenerate exact types from your project anytime: `npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts`.

## Build

```bash
npm run build     # outputs to dist/
```

Deploys as a static site to Vercel, Netlify, or Cloudflare Pages — set the same `VITE_*` env vars there.
