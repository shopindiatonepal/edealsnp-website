-- Edeals NP — full database setup (Supabase SQL Editor -> New query -> paste
-- this whole file -> Run). Safe to re-run any time: it drops and recreates
-- the store's tables from scratch, so run it fresh rather than patching an
-- older version bit by bit. Your storage buckets (product-images,
-- payment-proofs) are separate and untouched by this script — set those up
-- once in Storage -> New bucket if you haven't already.
--
-- WARNING: this deletes any existing products/orders/reviews data. Fine for
-- initial setup or a full reset; don't run it against a live store with real
-- orders you want to keep.

-- 1. Drop everything cleanly
drop table if exists order_status_history cascade;
drop table if exists order_comments cascade;
drop table if exists reviews cascade;
drop table if exists orders cascade;
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists store_settings cascade;

-- 2. Recreate everything fresh
create extension if not exists "pgcrypto";

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references categories(id) on delete cascade,
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  category_id uuid references categories(id) on delete set null,
  size text not null,
  price numeric(10,2) not null check (price >= 0),
  color text,
  description text default '',
  ingredients text,
  expiry_date date,
  image_url text,
  images jsonb default '[]',
  variants jsonb default '[]',
  featured boolean default false,
  sold_out boolean default false,
  on_sale boolean default false,
  sale_price numeric(10,2),
  stock_quantity int not null default 0,
  preorder boolean default false,
  weight_grams numeric(10,2) not null default 200,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  full_name text not null,
  phone text not null,
  alt_phone text,
  email text,
  address text not null,
  city text not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  delivery_charge numeric(10,2) not null default 200,
  total numeric(10,2) not null,
  payment_method text not null default 'cod',
  payment_type text default 'full',
  payment_screenshot_url text,
  status text not null default 'pending',
  customer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table order_comments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  author text not null check (author in ('admin', 'customer')),
  message text not null,
  created_at timestamptz default now()
);

-- Append-only log of every status change on an order — never overwritten,
-- so the full timeline (cancellation reason, courier updates, etc.) stays
-- visible forever instead of only showing the current status.
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  courier_name text,
  tracking_number text,
  tracking_url text,
  created_by text not null check (created_by in ('admin', 'customer')),
  created_at timestamptz default now()
);

create table store_settings (
  id int primary key default 1,
  payment_qr_url text,
  logo_url text,
  hero_image_url text,
  contact_image_url text,
  constraint single_row check (id = 1)
);
insert into store_settings (id) values (1);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz default now(),
  unique (product_id, customer_id)
);

-- ---------- Row Level Security ----------
alter table products enable row level security;
alter table orders enable row level security;
alter table store_settings enable row level security;
alter table reviews enable row level security;
alter table categories enable row level security;
alter table order_comments enable row level security;
alter table order_status_history enable row level security;

-- Public (anon) can read products, categories, and settings — needed for the storefront.
create policy "public read products" on products for select using (true);
create policy "public read settings" on store_settings for select using (true);
create policy "public read categories" on categories for select using (true);

-- Anyone can read reviews, but only a signed-in customer can leave one, and
-- only for a product they've actually received (checked server-side in
-- app/api/reviews/route.js, which uses the service role key — this RLS
-- policy is a second line of defense in case anything ever inserts directly).
create policy "public read reviews" on reviews for select using (true);
create policy "verified customers can review" on reviews for insert with check (
  auth.uid() = customer_id and char_length(customer_name) > 0 and rating between 1 and 5
);

-- Public can INSERT an order (placing an order from the storefront) but not
-- read/update/delete. Reading/updating orders, and all writes to
-- products/settings/categories, go through the server-side API routes using
-- the service role key, which bypasses RLS.
create policy "public can place orders" on orders for insert with check (true);

-- A signed-in customer can read their own past orders directly (used by the
-- account/order-history page, queried with the browser's anon key + their
-- session — RLS makes sure they only ever see rows that are theirs).
create policy "customers read own orders" on orders for select using (auth.uid() = customer_id);

-- Order comments: a customer can read/write comments only on their own
-- orders; admin comments/reads go through the server API with the service
-- role key.
create policy "customers read own order comments" on order_comments for select using (
  exists (select 1 from orders where orders.id = order_comments.order_id and orders.customer_id = auth.uid())
);
create policy "customers reply on own orders" on order_comments for insert with check (
  author = 'customer' and exists (select 1 from orders where orders.id = order_comments.order_id and orders.customer_id = auth.uid())
);

-- Status history is written only through the server API (service role), so
-- no insert policy is needed here — customers only ever need to read the
-- timeline for their own orders.
create policy "customers read own order status history" on order_status_history for select using (
  exists (select 1 from orders where orders.id = order_status_history.order_id and orders.customer_id = auth.uid())
);

-- ---------- Storage buckets (create once, separately) ----------
-- Storage -> New bucket, all set to Public:
--   product-images   (product photos, variant photos, gallery images)
--   payment-proofs   (customer payment screenshots at checkout)
--   site-assets      (logo, homepage background, contact photo, payment QR)
