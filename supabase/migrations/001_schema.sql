-- =====================================================================
-- Auto Supply POS & Inventory — Supabase schema
-- Run this whole file in Supabase Dashboard > SQL Editor (or `supabase db push`).
-- Safe to run on a fresh project. Timezone for reports: Asia/Manila.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'cashier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('CASH', 'GCASH', 'CARD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_log_type as enum ('SALE', 'RESTOCK', 'ADJUSTMENT');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- PROFILES (staff accounts linked to Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        public.user_role not null default 'cashier',
  created_at  timestamptz not null default now()
);

-- Auto-create a profile on signup. The very first user becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when not exists (select 1 from public.profiles) then 'admin'::public.user_role
         else 'cashier'::public.user_role end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer so they can be used inside RLS without recursion)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id                     uuid primary key default gen_random_uuid(),
  sku                    text not null unique,            -- barcode / part number
  name                   text not null,
  category_id            uuid references public.categories(id) on delete set null,
  brand                  text,
  vehicle_compatibility  text[] not null default '{}',
  cost_price             numeric(12,2) not null default 0 check (cost_price >= 0),
  retail_price           numeric(12,2) not null check (retail_price >= 0),
  stock_quantity         integer not null default 0 check (stock_quantity >= 0),
  reorder_level          integer not null default 5 check (reorder_level >= 0),
  is_active              boolean not null default true,
  -- Derived status so the inventory table can filter/page on it server-side
  stock_status           text generated always as (
                           case when stock_quantity <= 0 then 'OUT_OF_STOCK'
                                when stock_quantity <= reorder_level then 'LOW_STOCK'
                                else 'IN_STOCK' end
                         ) stored,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists products_status_idx        on public.products (stock_status);
create index if not exists products_category_idx      on public.products (category_id);
create index if not exists products_stock_idx         on public.products (stock_quantity);
create index if not exists products_vehicle_gin       on public.products using gin (vehicle_compatibility);
create index if not exists products_name_trgm         on public.products using gin (name gin_trgm_ops);
create index if not exists products_sku_trgm          on public.products using gin (sku gin_trgm_ops);
create index if not exists products_brand_trgm        on public.products using gin (brand gin_trgm_ops);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  contact_number    text,
  vehicle_plate_no  text,
  address           text,
  created_at        timestamptz not null default now()
);

create index if not exists customers_name_trgm  on public.customers using gin (name gin_trgm_ops);
create index if not exists customers_plate_idx  on public.customers (upper(vehicle_plate_no));

-- ---------------------------------------------------------------------
-- TRANSACTIONS (POS sales)
-- ---------------------------------------------------------------------
-- Gapless invoice numbering: a row-locked counter per Manila business day.
-- Unlike a sequence, this rolls back with a failed sale, so no numbers are skipped.
create table if not exists public.invoice_counters (
  day      date primary key,
  last_no  integer not null
);
alter table public.invoice_counters enable row level security;  -- no policies: RPC-only access

create table if not exists public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  invoice_number     text not null unique,
  cashier_id         uuid not null references public.profiles(id),
  customer_id        uuid references public.customers(id) on delete set null,
  subtotal           numeric(12,2) not null check (subtotal >= 0),
  discount           numeric(12,2) not null default 0 check (discount >= 0),
  tax                numeric(12,2) not null default 0 check (tax >= 0),
  total_amount       numeric(12,2) not null check (total_amount >= 0),
  payment_method     public.payment_method not null,
  payment_reference  text,
  amount_tendered    numeric(12,2),
  change_due         numeric(12,2),
  created_at         timestamptz not null default now()
);

create index if not exists transactions_created_idx  on public.transactions (created_at desc);
create index if not exists transactions_cashier_idx  on public.transactions (cashier_id);
create index if not exists transactions_customer_idx on public.transactions (customer_id);

-- ---------------------------------------------------------------------
-- TRANSACTION ITEMS
-- ---------------------------------------------------------------------
create table if not exists public.transaction_items (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  product_id      uuid not null references public.products(id),
  product_name    text not null,           -- snapshot for receipts/history
  sku             text not null,           -- snapshot
  quantity        integer not null check (quantity > 0),
  unit_price      numeric(12,2) not null check (unit_price >= 0),
  discount        numeric(12,2) not null default 0 check (discount >= 0),
  subtotal        numeric(12,2) not null check (subtotal >= 0)
);

create index if not exists transaction_items_tx_idx      on public.transaction_items (transaction_id);
create index if not exists transaction_items_product_idx on public.transaction_items (product_id);

-- ---------------------------------------------------------------------
-- INVENTORY LOGS (audit trail for every stock movement)
-- ---------------------------------------------------------------------
create table if not exists public.inventory_logs (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  change_amount   integer not null check (change_amount <> 0),
  quantity_after  integer not null,
  type            public.inventory_log_type not null,
  reference_id    uuid,                     -- transaction id for SALE
  notes           text,
  user_id         uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

create index if not exists inventory_logs_product_idx on public.inventory_logs (product_id, created_at desc);
create index if not exists inventory_logs_created_idx on public.inventory_logs (created_at desc);

-- Log opening stock when a product is created with quantity > 0
create or replace function public.log_initial_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock_quantity > 0 then
    insert into public.inventory_logs (product_id, change_amount, quantity_after, type, notes, user_id)
    values (new.id, new.stock_quantity, new.stock_quantity, 'RESTOCK', 'Opening stock', auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists products_initial_stock on public.products;
create trigger products_initial_stock after insert on public.products
  for each row execute function public.log_initial_stock();

-- =====================================================================
-- RPC: ATOMIC CHECKOUT
-- p_items: [{ "product_id": uuid, "quantity": int, "discount": numeric }]
-- Prices are read from the DB (never trusted from the client).
-- Retail prices are VAT-inclusive; tax is the VAT portion of the total.
-- =====================================================================
create or replace function public.process_checkout(
  p_items             jsonb,
  p_payment_method    public.payment_method,
  p_customer_id       uuid    default null,
  p_cart_discount     numeric default 0,
  p_payment_reference text    default null,
  p_amount_tendered   numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vat_rate     constant numeric := 0.12;
  v_user         uuid := auth.uid();
  v_tx_id        uuid := gen_random_uuid();
  v_invoice      text;
  v_day          date := (now() at time zone 'Asia/Manila')::date;
  v_seq          integer;
  v_item         record;
  v_product      public.products%rowtype;
  v_line_gross   numeric(12,2);
  v_line_net     numeric(12,2);
  v_subtotal     numeric(12,2) := 0;
  v_item_disc    numeric(12,2) := 0;
  v_total        numeric(12,2);
  v_tax          numeric(12,2);
  v_change       numeric(12,2);
begin
  if v_user is null or not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;

  if coalesce(p_cart_discount, 0) < 0 then
    raise exception 'Discount cannot be negative' using errcode = '22023';
  end if;

  -- Header first with a temporary invoice number (real one assigned at the end,
  -- so the counter row is locked only briefly). Everything rolls back on error.
  insert into public.transactions (
    id, invoice_number, cashier_id, customer_id, subtotal, discount, tax,
    total_amount, payment_method, payment_reference
  ) values (
    v_tx_id, 'PENDING-' || v_tx_id, v_user, p_customer_id, 0, 0, 0, 0, p_payment_method, p_payment_reference
  );

  -- Merge duplicate lines, then lock rows in a stable order (by id) to avoid deadlocks
  for v_item in
    select (e->>'product_id')::uuid           as product_id,
           sum((e->>'quantity')::int)          as quantity,
           sum(coalesce((e->>'discount')::numeric, 0)) as discount
    from jsonb_array_elements(p_items) e
    group by (e->>'product_id')::uuid
    order by (e->>'product_id')::uuid
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Invalid quantity for product %', v_item.product_id using errcode = '22023';
    end if;

    select * into v_product from public.products
    where id = v_item.product_id and is_active
    for update;

    if not found then
      raise exception 'Product % not found or inactive', v_item.product_id using errcode = 'P0002';
    end if;

    if v_product.stock_quantity < v_item.quantity then
      raise exception 'Insufficient stock for % (%): % available, % requested',
        v_product.name, v_product.sku, v_product.stock_quantity, v_item.quantity
        using errcode = 'P0001';
    end if;

    v_line_gross := round(v_product.retail_price * v_item.quantity, 2);
    if v_item.discount < 0 or v_item.discount > v_line_gross then
      raise exception 'Invalid line discount for %', v_product.sku using errcode = '22023';
    end if;
    v_line_net := v_line_gross - round(v_item.discount, 2);

    insert into public.transaction_items (
      transaction_id, product_id, product_name, sku, quantity, unit_price, discount, subtotal
    ) values (
      v_tx_id, v_product.id, v_product.name, v_product.sku, v_item.quantity,
      v_product.retail_price, round(v_item.discount, 2), v_line_net
    );

    update public.products
       set stock_quantity = stock_quantity - v_item.quantity
     where id = v_product.id;

    insert into public.inventory_logs (product_id, change_amount, quantity_after, type, reference_id, user_id)
    values (v_product.id, -v_item.quantity, v_product.stock_quantity - v_item.quantity,
            'SALE', v_tx_id, v_user);

    v_subtotal  := v_subtotal + v_line_gross;
    v_item_disc := v_item_disc + round(v_item.discount, 2);
  end loop;

  if round(coalesce(p_cart_discount, 0), 2) > (v_subtotal - v_item_disc) then
    raise exception 'Cart discount exceeds sale amount' using errcode = '22023';
  end if;

  v_total := v_subtotal - v_item_disc - round(coalesce(p_cart_discount, 0), 2);
  v_tax   := round(v_total * v_vat_rate / (1 + v_vat_rate), 2);

  if p_payment_method = 'CASH' then
    if p_amount_tendered is null or p_amount_tendered < v_total then
      raise exception 'Amount tendered (%) is less than total (%)', coalesce(p_amount_tendered, 0), v_total
        using errcode = '22023';
    end if;
    v_change := round(p_amount_tendered - v_total, 2);
  else
    if coalesce(trim(p_payment_reference), '') = '' then
      raise exception 'Payment reference is required for % payments', p_payment_method
        using errcode = '22023';
    end if;
  end if;

  -- All validation passed: take the next gapless invoice number for today
  insert into public.invoice_counters as c (day, last_no) values (v_day, 1)
  on conflict (day) do update set last_no = c.last_no + 1
  returning last_no into v_seq;
  v_invoice := 'INV-' || to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  update public.inventory_logs set notes = v_invoice where reference_id = v_tx_id;

  update public.transactions
     set invoice_number  = v_invoice,
         subtotal        = v_subtotal,
         discount        = v_item_disc + round(coalesce(p_cart_discount, 0), 2),
         tax             = v_tax,
         total_amount    = v_total,
         amount_tendered = p_amount_tendered,
         change_due      = v_change
   where id = v_tx_id;

  return jsonb_build_object(
    'transaction_id', v_tx_id,
    'invoice_number', v_invoice,
    'subtotal',       v_subtotal,
    'discount',       v_item_disc + round(coalesce(p_cart_discount, 0), 2),
    'tax',            v_tax,
    'total_amount',   v_total,
    'amount_tendered',p_amount_tendered,
    'change_due',     v_change,
    'created_at',     now()
  );
end;
$$;

-- =====================================================================
-- RPC: STOCK ADJUSTMENT / RESTOCK
-- RESTOCK (positive only): any staff. ADJUSTMENT (+/-): admin only.
-- =====================================================================
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_change     integer,
  p_type       public.inventory_log_type,
  p_notes      text default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_type = 'SALE' then
    raise exception 'Use process_checkout for sales' using errcode = '22023';
  end if;
  if p_change = 0 then
    raise exception 'Change amount cannot be zero' using errcode = '22023';
  end if;
  if p_type = 'RESTOCK' and p_change < 0 then
    raise exception 'Restock quantity must be positive' using errcode = '22023';
  end if;
  if p_type = 'ADJUSTMENT' and not public.is_admin() then
    raise exception 'Only admins can make stock adjustments' using errcode = '42501';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if v_product.stock_quantity + p_change < 0 then
    raise exception 'Adjustment would make stock negative (current: %)', v_product.stock_quantity
      using errcode = 'P0001';
  end if;

  update public.products
     set stock_quantity = stock_quantity + p_change
   where id = p_product_id
  returning * into v_product;

  insert into public.inventory_logs (product_id, change_amount, quantity_after, type, notes, user_id)
  values (p_product_id, p_change, v_product.stock_quantity, p_type, p_notes, auth.uid());

  return v_product;
end;
$$;

-- =====================================================================
-- RPC: PRODUCT SEARCH (SKU / name / brand / vehicle tag, partial match)
-- =====================================================================
create or replace function public.search_products(p_query text, p_limit int default 40)
returns setof public.products
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.products p
  where p.is_active
    and (
      coalesce(trim(p_query), '') = ''
      or p.sku   ilike '%' || p_query || '%'
      or p.name  ilike '%' || p_query || '%'
      or p.brand ilike '%' || p_query || '%'
      or exists (select 1 from unnest(p.vehicle_compatibility) t where t ilike '%' || p_query || '%')
    )
  order by (lower(p.sku) = lower(coalesce(p_query, ''))) desc, p.name
  limit greatest(1, least(p_limit, 200));
$$;

-- =====================================================================
-- RPCs: DASHBOARD (Asia/Manila day boundaries)
-- =====================================================================
create or replace function public.get_dashboard_metrics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      (date_trunc('day',   now() at time zone 'Asia/Manila') at time zone 'Asia/Manila') as day_start,
      (date_trunc('month', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila') as month_start
  )
  select jsonb_build_object(
    'revenue_today',       coalesce((select sum(total_amount) from transactions, bounds where created_at >= day_start), 0),
    'revenue_month',       coalesce((select sum(total_amount) from transactions, bounds where created_at >= month_start), 0),
    'transactions_today',  (select count(*) from transactions, bounds where created_at >= day_start),
    'transactions_month',  (select count(*) from transactions, bounds where created_at >= month_start),
    'low_stock_count',     (select count(*) from products where is_active and stock_quantity <= reorder_level and stock_quantity > 0),
    'out_of_stock_count',  (select count(*) from products where is_active and stock_quantity = 0)
  );
$$;

create or replace function public.get_sales_trend(p_days int default 30)
returns table (day date, revenue numeric, transactions bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with days as (
    select generate_series(
      (now() at time zone 'Asia/Manila')::date - (greatest(p_days, 1) - 1),
      (now() at time zone 'Asia/Manila')::date,
      interval '1 day'
    )::date as day
  )
  select d.day,
         coalesce(sum(t.total_amount), 0)::numeric as revenue,
         count(t.id) as transactions
  from days d
  left join public.transactions t
    on (t.created_at at time zone 'Asia/Manila')::date = d.day
  group by d.day
  order by d.day;
$$;

create or replace function public.get_top_products(p_days int default 30, p_limit int default 5)
returns table (product_id uuid, name text, sku text, qty_sold bigint, revenue numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select ti.product_id, max(ti.product_name), max(ti.sku),
         sum(ti.quantity)::bigint, sum(ti.subtotal)
  from public.transaction_items ti
  join public.transactions t on t.id = ti.transaction_id
  where t.created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by ti.product_id
  order by sum(ti.quantity) desc
  limit greatest(1, p_limit);
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.customers         enable row level security;
alter table public.transactions      enable row level security;
alter table public.transaction_items enable row level security;
alter table public.inventory_logs    enable row level security;

-- Profiles
drop policy if exists "profiles: staff read"   on public.profiles;
drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: staff read"   on public.profiles for select to authenticated using (public.is_staff());
create policy "profiles: admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Categories
drop policy if exists "categories: staff read"  on public.categories;
drop policy if exists "categories: admin write" on public.categories;
create policy "categories: staff read"  on public.categories for select to authenticated using (public.is_staff());
create policy "categories: admin write" on public.categories for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Products (stock changes only via RPCs — see column grants below)
drop policy if exists "products: staff read"   on public.products;
drop policy if exists "products: admin insert" on public.products;
drop policy if exists "products: admin update" on public.products;
drop policy if exists "products: admin delete" on public.products;
create policy "products: staff read"   on public.products for select to authenticated using (public.is_staff());
create policy "products: admin insert" on public.products for insert to authenticated with check (public.is_admin());
create policy "products: admin update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products: admin delete" on public.products for delete to authenticated using (public.is_admin());

-- Customers
drop policy if exists "customers: staff read"   on public.customers;
drop policy if exists "customers: staff insert" on public.customers;
drop policy if exists "customers: staff update" on public.customers;
drop policy if exists "customers: admin delete" on public.customers;
create policy "customers: staff read"   on public.customers for select to authenticated using (public.is_staff());
create policy "customers: staff insert" on public.customers for insert to authenticated with check (public.is_staff());
create policy "customers: staff update" on public.customers for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "customers: admin delete" on public.customers for delete to authenticated using (public.is_admin());

-- Transactions / items / logs: read-only for staff; writes happen only in RPCs
drop policy if exists "transactions: staff read"      on public.transactions;
drop policy if exists "transaction_items: staff read" on public.transaction_items;
drop policy if exists "inventory_logs: staff read"    on public.inventory_logs;
create policy "transactions: staff read"      on public.transactions      for select to authenticated using (public.is_staff());
create policy "transaction_items: staff read" on public.transaction_items for select to authenticated using (public.is_staff());
create policy "inventory_logs: staff read"    on public.inventory_logs    for select to authenticated using (public.is_staff());

-- Column-level guard: nobody can edit stock_quantity directly (must use adjust_stock / process_checkout)
revoke update on public.products from authenticated, anon;
grant update (sku, name, category_id, brand, vehicle_compatibility, cost_price, retail_price, reorder_level, is_active)
  on public.products to authenticated;

-- Function execute permissions
revoke execute on function public.process_checkout(jsonb, public.payment_method, uuid, numeric, text, numeric) from public, anon;
revoke execute on function public.adjust_stock(uuid, integer, public.inventory_log_type, text) from public, anon;
grant  execute on function public.process_checkout(jsonb, public.payment_method, uuid, numeric, text, numeric) to authenticated;
grant  execute on function public.adjust_stock(uuid, integer, public.inventory_log_type, text) to authenticated;

-- =====================================================================
-- REALTIME: live stock updates on the inventory table / POS grid
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null; when undefined_object then null; end $$;
