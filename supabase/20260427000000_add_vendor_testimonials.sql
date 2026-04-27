-- ── vendor_testimonials table ──────────────────────────────────────────────
create table if not exists public.vendor_testimonials (
  id               uuid primary key default gen_random_uuid(),
  vendor_id        uuid not null references public.vendors(id) on delete cascade,
  customer_name    text not null,
  customer_faculty text,
  item_purchased   text not null,
  quote            text,
  screenshot_url   text,
  source           text not null check (source in ('whatsapp','instagram','telegram','inperson','sms')),
  type             text not null check (type in ('text','image')),
  status           text not null default 'pending' check (status in ('pending','published','rejected')),
  is_highlighted   boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Indexes
create index if not exists vendor_testimonials_vendor_id_idx on public.vendor_testimonials(vendor_id);
create index if not exists vendor_testimonials_status_idx    on public.vendor_testimonials(status);

-- RLS
alter table public.vendor_testimonials enable row level security;

-- Vendors can read their own testimonials
create policy "vendor can read own testimonials"
  on public.vendor_testimonials for select
  using (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

-- Vendors can insert their own testimonials
create policy "vendor can insert own testimonials"
  on public.vendor_testimonials for insert
  with check (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

-- Vendors can update their own testimonials (for highlight toggle)
create policy "vendor can update own testimonials"
  on public.vendor_testimonials for update
  using (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

-- Vendors can delete their own testimonials
create policy "vendor can delete own testimonials"
  on public.vendor_testimonials for delete
  using (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

-- Public can read published testimonials (for VendorProfile page)
create policy "public can read published testimonials"
  on public.vendor_testimonials for select
  using (status = 'published');

-- Admins can read and update all (for moderation)
create policy "admin can manage all testimonials"
  on public.vendor_testimonials for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('super_admin','sub_admin')
    )
  );
