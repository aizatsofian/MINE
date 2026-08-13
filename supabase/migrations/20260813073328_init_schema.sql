-- Data2Dashboard — initial Supabase schema
-- ==========================================================================
-- Replaces the Google Apps Script + Google Sheet backend (Code.gs). Mirrors
-- its data model (PRODUCTS / REVIEWS / ORDERS / SETTINGS / ADMIN_USERS)
-- but adapted to real Postgres: real foreign keys, real types, RLS instead
-- of hand-rolled token auth.
--
-- Everything lives in its own "data2dashboard" schema, not "public" — this
-- Supabase project already runs an unrelated clinic system (public.profiles,
-- public.visit, real patient data) that must not be touched or collided
-- with. The frontend must add "data2dashboard" to Dashboard > Settings >
-- API > Exposed Schemas before PostgREST will serve it, and every
-- supabase-js call must use .schema('data2dashboard').
--
-- Admin identity now lives in Supabase Auth (auth.users) instead of a
-- custom salted-hash column — there is no admin_users table here, only
-- data2dashboard.profiles, which stores the *role* for an existing
-- auth.users row (deliberately NOT named the same as the clinic's own
-- public.profiles, even though it's schema-isolated already, to keep them
-- unambiguous to read). Creating the admin account itself is a manual
-- Dashboard/Auth step (see migration report), not something this SQL does.

create schema if not exists data2dashboard;

comment on schema data2dashboard is 'Data2Dashboard app: products/reviews/orders/settings/admin profiles. Isolated from public (used by an unrelated clinic system in this same project).';

-- ==========================================================================
-- PROFILES — role for a Supabase Auth user. 1:1 with auth.users.
-- ==========================================================================

create table data2dashboard.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    role text not null default 'admin' check (role in ('admin')),
    created_at timestamptz not null default now()
);

comment on table data2dashboard.profiles is 'Role for a Supabase Auth user, scoped to the Data2Dashboard app. Every row here is an admin today — there is no public signup flow. Not to be confused with the unrelated public.profiles table (clinic staff).';

-- Auto-create a profile (role=admin) whenever an admin account is created
-- in Supabase Auth (Dashboard > Authentication > Add user, or the Admin API).
-- This app has no public self-signup, so every new auth.users row is an
-- intentionally-provisioned Data2Dashboard admin.
create or replace function data2dashboard.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = data2dashboard
as $$
begin
    insert into data2dashboard.profiles (id, email, role)
    values (new.id, new.email, 'admin');
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function data2dashboard.handle_new_user();

-- security definer so it can read profiles regardless of the caller's own
-- RLS visibility into that table (avoids recursive-policy issues).
create or replace function data2dashboard.is_admin()
returns boolean
language sql
security definer
stable
set search_path = data2dashboard
as $$
    select exists (
        select 1 from data2dashboard.profiles
        where id = auth.uid() and role = 'admin'
    );
$$;

-- ==========================================================================
-- Shared updated_at trigger
-- ==========================================================================

create or replace function data2dashboard.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ==========================================================================
-- PRODUCTS — was the PRODUCTS sheet tab (PRODUCTS_HEADERS in Code.gs).
-- ==========================================================================

create table data2dashboard.products (
    id bigint generated always as identity primary key,
    product_name text not null,
    category text not null,
    description text not null default '',
    price_self_setup numeric(10, 2) not null default 0,
    price_full_setup numeric(10, 2) not null default 0,
    demo_url text not null default '',
    powerbi_available boolean not null default false,
    thumbnail_url text not null default '',
    preview_image_url text not null default '',
    features text not null default '',
    technology text not null default '',
    rating numeric(2, 1) not null default 0,
    review_count integer not null default 0,
    demo_views integer not null default 0,
    purchase_count integer not null default 0,
    badge text not null default '',
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table data2dashboard.products is 'Was the PRODUCTS sheet tab. demo_views/purchase_count are plain integers now (the sheet stored demo_views as a formatted string like "1,200").';

create index products_status_idx on data2dashboard.products (status);
create index products_category_idx on data2dashboard.products (category);

create trigger trg_products_updated_at
    before update on data2dashboard.products
    for each row execute function data2dashboard.set_updated_at();

-- ==========================================================================
-- REVIEWS — was the REVIEWS sheet tab.
-- ==========================================================================

create table data2dashboard.reviews (
    id bigint generated always as identity primary key,
    product_id bigint references data2dashboard.products(id) on delete cascade,
    name text not null,
    phone text not null default '',
    rating smallint not null check (rating between 1 and 5),
    comment text not null default '',
    status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
    created_at timestamptz not null default now()
);

create index reviews_product_id_idx on data2dashboard.reviews (product_id);
create index reviews_status_idx on data2dashboard.reviews (status);

-- A submitted review is always Pending, no matter what the client sends —
-- mirrors handleSubmitReview_() in Code.gs, which hardcoded 'Pending'
-- server-side rather than trusting the submitted status.
create or replace function data2dashboard.force_review_pending()
returns trigger
language plpgsql
as $$
begin
    new.status := 'Pending';
    return new;
end;
$$;

create trigger trg_reviews_force_pending
    before insert on data2dashboard.reviews
    for each row execute function data2dashboard.force_review_pending();

-- ==========================================================================
-- ORDERS — was the ORDERS sheet tab.
-- ==========================================================================

create table data2dashboard.orders (
    id bigint generated always as identity primary key,
    product_id bigint references data2dashboard.products(id) on delete set null,
    customer_name text not null,
    phone text not null default '',
    package text not null default '',
    price numeric(10, 2) not null default 0,
    payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid', 'Cancelled')),
    created_at timestamptz not null default now()
);

create index orders_product_id_idx on data2dashboard.orders (product_id);
create index orders_payment_status_idx on data2dashboard.orders (payment_status);

-- Mirrors handleSubmitOrder_() in Code.gs: payment_status always starts
-- Pending regardless of what the client sends.
create or replace function data2dashboard.force_order_pending()
returns trigger
language plpgsql
as $$
begin
    new.payment_status := 'Pending';
    return new;
end;
$$;

create trigger trg_orders_force_pending
    before insert on data2dashboard.orders
    for each row execute function data2dashboard.force_order_pending();

-- ==========================================================================
-- SETTINGS — was the SETTINGS sheet tab (key/value).
-- ==========================================================================

create table data2dashboard.settings (
    key text primary key,
    value text not null default '',
    updated_at timestamptz not null default now()
);

create trigger trg_settings_updated_at
    before update on data2dashboard.settings
    for each row execute function data2dashboard.set_updated_at();

-- ==========================================================================
-- ROW LEVEL SECURITY — default deny, explicit allow per operation.
-- ==========================================================================

alter table data2dashboard.profiles enable row level security;
alter table data2dashboard.products enable row level security;
alter table data2dashboard.reviews enable row level security;
alter table data2dashboard.orders enable row level security;
alter table data2dashboard.settings enable row level security;

-- profiles: an admin can read their own row only. No public access, no
-- listing other admins.
create policy "profiles_select_own"
    on data2dashboard.profiles for select
    to authenticated
    using (id = auth.uid());

-- products: public can read active products; admins can read everything
-- (including inactive, for the admin table). Only admins can write.
create policy "products_public_read_active"
    on data2dashboard.products for select
    to anon, authenticated
    using (status = 'active');

create policy "products_admin_read_all"
    on data2dashboard.products for select
    to authenticated
    using (data2dashboard.is_admin());

create policy "products_admin_insert"
    on data2dashboard.products for insert
    to authenticated
    with check (data2dashboard.is_admin());

create policy "products_admin_update"
    on data2dashboard.products for update
    to authenticated
    using (data2dashboard.is_admin())
    with check (data2dashboard.is_admin());

create policy "products_admin_delete"
    on data2dashboard.products for delete
    to authenticated
    using (data2dashboard.is_admin());

-- reviews: public can read only Approved reviews, and can submit new ones
-- (forced to Pending by the trigger above). Only admins can read Pending/
-- Rejected reviews or change a review's status.
create policy "reviews_public_read_approved"
    on data2dashboard.reviews for select
    to anon, authenticated
    using (status = 'Approved');

create policy "reviews_admin_read_all"
    on data2dashboard.reviews for select
    to authenticated
    using (data2dashboard.is_admin());

create policy "reviews_public_insert"
    on data2dashboard.reviews for insert
    to anon, authenticated
    with check (true);

create policy "reviews_admin_update"
    on data2dashboard.reviews for update
    to authenticated
    using (data2dashboard.is_admin())
    with check (data2dashboard.is_admin());

create policy "reviews_admin_delete"
    on data2dashboard.reviews for delete
    to authenticated
    using (data2dashboard.is_admin());

-- orders: contain customer name/phone, so unlike reviews there is no
-- public read at all — only insert (forced to Pending), matching Code.gs
-- (submitOrder was public, listOrders required auth).
create policy "orders_public_insert"
    on data2dashboard.orders for insert
    to anon, authenticated
    with check (true);

create policy "orders_admin_read_all"
    on data2dashboard.orders for select
    to authenticated
    using (data2dashboard.is_admin());

create policy "orders_admin_update"
    on data2dashboard.orders for update
    to authenticated
    using (data2dashboard.is_admin())
    with check (data2dashboard.is_admin());

create policy "orders_admin_delete"
    on data2dashboard.orders for delete
    to authenticated
    using (data2dashboard.is_admin());

-- settings: public read-only (matches Code.gs's getSettings being
-- unauthenticated), admin-only write.
create policy "settings_public_read"
    on data2dashboard.settings for select
    to anon, authenticated
    using (true);

create policy "settings_admin_insert"
    on data2dashboard.settings for insert
    to authenticated
    with check (data2dashboard.is_admin());

create policy "settings_admin_update"
    on data2dashboard.settings for update
    to authenticated
    using (data2dashboard.is_admin())
    with check (data2dashboard.is_admin());

-- ==========================================================================
-- STORAGE — product-images bucket. Public read, admin-only write.
-- Storage buckets are project-global (not schema-scoped), but this name
-- was confirmed free before creating it (no existing buckets in this
-- project).
-- ==========================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'product-images');

create policy "product_images_admin_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'product-images' and data2dashboard.is_admin());

create policy "product_images_admin_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'product-images' and data2dashboard.is_admin())
    with check (bucket_id = 'product-images' and data2dashboard.is_admin());

create policy "product_images_admin_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'product-images' and data2dashboard.is_admin());
