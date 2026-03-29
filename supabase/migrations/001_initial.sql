-- ============================================================
-- PETAL — Full Supabase Migration
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('owner', 'designer', 'staff');
create type member_status as enum ('pending', 'active', 'revoked');
create type labor_mode as enum ('percentage', 'hourly');
create type pricing_mode as enum ('build_up', 'work_back');
create type recipe_status as enum ('draft', 'active', 'archived');
create type event_status as enum ('to_do', 'in_progress', 'ordered', 'complete');
create type item_unit as enum ('stem', 'bunch', 'box', 'each', 'yard', 'foot');
create type hard_good_category as enum ('container', 'foam', 'ribbon', 'wire', 'packaging', 'other');
create type recipe_item_type as enum ('flower', 'hard_good', 'rental', 'misc');
create type event_type as enum (
  'bridal_bouquet', 'bridesmaid_bouquet', 'toss_bouquet', 'boutonniere', 'corsage',
  'centerpiece_low', 'centerpiece_tall', 'ceremony_arch', 'altar_arrangement',
  'aisle_arrangement', 'pew_marker', 'ceremony_backdrop', 'welcome_arrangement',
  'cocktail_arrangement', 'sweetheart_table', 'cake_flowers', 'reception_table',
  'hanging_installation', 'bud_vase_cluster', 'bar_arrangement', 'other'
);

-- ============================================================
-- STUDIOS
-- ============================================================

create table studios (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  logo_url    text,
  currency_symbol text not null default '$',
  timezone    text not null default 'America/New_York',
  invite_code text unique not null default upper(substring(replace(uuid_generate_v4()::text, '-', ''), 1, 8)),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- STUDIO MEMBERS
-- ============================================================

create table studio_members (
  id             uuid primary key default uuid_generate_v4(),
  studio_id      uuid not null references studios(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  role           user_role not null default 'staff',
  invited_email  text,
  status         member_status not null default 'pending',
  created_at     timestamptz not null default now(),
  last_active_at timestamptz
);

create index idx_studio_members_studio_id on studio_members(studio_id);
create index idx_studio_members_user_id on studio_members(user_id);

-- ============================================================
-- STUDIO SETTINGS
-- ============================================================

create table studio_settings (
  id                      uuid primary key default uuid_generate_v4(),
  studio_id               uuid not null unique references studios(id) on delete cascade,
  default_flower_markup   numeric(5,2) not null default 3.5,
  default_hardgoods_markup numeric(5,2) not null default 2.5,
  default_rental_markup   numeric(5,2) not null default 2.5,
  default_labor_mode      labor_mode not null default 'percentage',
  default_design_fee_pct  numeric(5,2) not null default 30,
  default_prep_rate       numeric(8,2) not null default 35,
  default_design_rate     numeric(8,2) not null default 65,
  default_delivery_fee    numeric(8,2) not null default 150,
  default_setup_fee       numeric(8,2) not null default 200,
  default_teardown_fee    numeric(8,2) not null default 100,
  default_tax_rate        numeric(5,2) not null default 0,
  default_margin_target   numeric(5,2) not null default 70,
  default_waste_buffer_pct numeric(5,2) not null default 10,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================================
-- FLOWERS CATALOG
-- ============================================================

create table flowers (
  id                      uuid primary key default uuid_generate_v4(),
  studio_id               uuid not null references studios(id) on delete cascade,
  name                    text not null,
  variety                 text,
  color_name              text,
  color_hex               text,
  unit                    item_unit not null default 'stem',
  stems_per_bunch         integer not null default 10,
  wholesale_cost_per_stem numeric(8,4) not null default 0,
  supplier                text,
  notes                   text,
  image_url               text,
  seasonal_months         integer[] not null default '{}',
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_flowers_studio_id on flowers(studio_id);
create index idx_flowers_name on flowers using gin(name gin_trgm_ops);

-- ============================================================
-- HARD GOODS CATALOG
-- ============================================================

create table hard_goods (
  id             uuid primary key default uuid_generate_v4(),
  studio_id      uuid not null references studios(id) on delete cascade,
  name           text not null,
  category       hard_good_category not null default 'other',
  unit           item_unit not null default 'each',
  wholesale_cost numeric(8,4) not null default 0,
  supplier       text,
  notes          text,
  image_url      text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_hard_goods_studio_id on hard_goods(studio_id);

-- ============================================================
-- RENTALS CATALOG
-- ============================================================

create table rentals (
  id               uuid primary key default uuid_generate_v4(),
  studio_id        uuid not null references studios(id) on delete cascade,
  name             text not null,
  acquisition_cost numeric(8,2) not null default 0,
  times_used       integer not null default 1,
  notes            text,
  image_url        text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_rentals_studio_id on rentals(studio_id);

-- ============================================================
-- RECIPES
-- ============================================================

create table recipes (
  id                  uuid primary key default uuid_generate_v4(),
  studio_id           uuid not null references studios(id) on delete cascade,
  name                text not null default 'Untitled Recipe',
  event_type          event_type,
  description         text,
  -- Per-recipe markup overrides (default from studio_settings)
  flower_markup       numeric(5,2),
  hardgoods_markup    numeric(5,2),
  rental_markup       numeric(5,2),
  -- Labor
  labor_mode          labor_mode,
  design_fee_pct      numeric(5,2),
  prep_hours          numeric(6,2) not null default 0,
  prep_rate           numeric(8,2),
  design_hours        numeric(6,2) not null default 0,
  design_rate         numeric(8,2),
  -- Fees
  delivery_fee        numeric(8,2),
  setup_fee           numeric(8,2),
  teardown_fee        numeric(8,2),
  tax_rate            numeric(5,2),
  margin_target       numeric(5,2),
  -- Pricing mode
  pricing_mode        pricing_mode not null default 'build_up',
  target_retail_price numeric(10,2),
  -- Status & sharing
  status              recipe_status not null default 'draft',
  is_template         boolean not null default false,
  share_token         uuid unique default uuid_generate_v4(),
  share_token_active  boolean not null default false,
  -- Meta
  notes               text,
  moodboard_url       text,
  image_url           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_recipes_studio_id on recipes(studio_id);
create index idx_recipes_share_token on recipes(share_token);
create index idx_recipes_status on recipes(status);

-- ============================================================
-- RECIPE ITEMS
-- ============================================================

create table recipe_items (
  id                       uuid primary key default uuid_generate_v4(),
  recipe_id                uuid not null references recipes(id) on delete cascade,
  item_type                recipe_item_type not null,
  flower_id                uuid references flowers(id) on delete set null,
  hard_good_id             uuid references hard_goods(id) on delete set null,
  rental_id                uuid references rentals(id) on delete set null,
  -- Snapshot of catalog data at time of adding
  item_name                text not null,
  item_variety             text,
  item_color_name          text,
  item_color_hex           text,
  item_unit                item_unit,
  item_image_url           text,
  wholesale_cost_snapshot  numeric(8,4) not null default 0,
  -- Current state
  quantity                 numeric(8,2) not null default 1,
  notes                    text,
  sort_order               integer not null default 0,
  created_at               timestamptz not null default now()
);

create index idx_recipe_items_recipe_id on recipe_items(recipe_id);
create index idx_recipe_items_flower_id on recipe_items(flower_id);

-- ============================================================
-- EVENTS
-- ============================================================

create table events (
  id             uuid primary key default uuid_generate_v4(),
  studio_id      uuid not null references studios(id) on delete cascade,
  name           text not null,
  client_name    text,
  event_date     date,
  venue          text,
  recipe_status  event_status not null default 'to_do',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_events_studio_id on events(studio_id);
create index idx_events_event_date on events(event_date);

-- ============================================================
-- EVENT RECIPES (junction)
-- ============================================================

create table event_recipes (
  id                   uuid primary key default uuid_generate_v4(),
  event_id             uuid not null references events(id) on delete cascade,
  recipe_id            uuid not null references recipes(id) on delete cascade,
  quantity             integer not null default 1,
  override_retail_price numeric(10,2),
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now()
);

create index idx_event_recipes_event_id on event_recipes(event_id);
create index idx_event_recipes_recipe_id on event_recipes(recipe_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_studio_settings_updated_at
  before update on studio_settings
  for each row execute function update_updated_at();

create trigger trg_flowers_updated_at
  before update on flowers
  for each row execute function update_updated_at();

create trigger trg_hard_goods_updated_at
  before update on hard_goods
  for each row execute function update_updated_at();

create trigger trg_rentals_updated_at
  before update on rentals
  for each row execute function update_updated_at();

create trigger trg_recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();

create trigger trg_events_updated_at
  before update on events
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table studios enable row level security;
alter table studio_members enable row level security;
alter table studio_settings enable row level security;
alter table flowers enable row level security;
alter table hard_goods enable row level security;
alter table rentals enable row level security;
alter table recipes enable row level security;
alter table recipe_items enable row level security;
alter table events enable row level security;
alter table event_recipes enable row level security;

-- Helper function: get current user's studio_id
create or replace function get_my_studio_id()
returns uuid as $$
  select studio_id from studio_members
  where user_id = auth.uid() and status = 'active'
  limit 1;
$$ language sql security definer stable;

-- Helper function: get current user's role
create or replace function get_my_role()
returns user_role as $$
  select role from studio_members
  where user_id = auth.uid() and status = 'active'
  limit 1;
$$ language sql security definer stable;

-- ── Studios ───────────────────────────────────────────────

create policy "authenticated users can create studios"
  on studios for insert
  with check (auth.uid() is not null);

create policy "members can read their studio"
  on studios for select
  using (id = get_my_studio_id());

create policy "owners can update their studio"
  on studios for update
  using (id = get_my_studio_id() and get_my_role() = 'owner');

-- ── Studio Members ────────────────────────────────────────

create policy "authenticated users can insert studio members"
  on studio_members for insert
  with check (auth.uid() is not null);

create policy "members can read studio members"
  on studio_members for select
  using (studio_id = get_my_studio_id());

create policy "owners can manage members"
  on studio_members for all
  using (studio_id = get_my_studio_id() and get_my_role() = 'owner');

create policy "users can see their own membership"
  on studio_members for select
  using (user_id = auth.uid());

-- ── Studio Settings ───────────────────────────────────────

create policy "authenticated users can insert studio settings"
  on studio_settings for insert
  with check (auth.uid() is not null);

create policy "members can read settings"
  on studio_settings for select
  using (studio_id = get_my_studio_id());

create policy "owners and designers can update settings"
  on studio_settings for update
  using (studio_id = get_my_studio_id() and get_my_role() in ('owner', 'designer'));

-- ── Flowers ───────────────────────────────────────────────

create policy "members can read flowers"
  on flowers for select
  using (studio_id = get_my_studio_id());

create policy "owners and designers can manage flowers"
  on flowers for all
  using (studio_id = get_my_studio_id() and get_my_role() in ('owner', 'designer'));

-- ── Hard Goods ────────────────────────────────────────────

create policy "members can read hard_goods"
  on hard_goods for select
  using (studio_id = get_my_studio_id());

create policy "owners and designers can manage hard_goods"
  on hard_goods for all
  using (studio_id = get_my_studio_id() and get_my_role() in ('owner', 'designer'));

-- ── Rentals ───────────────────────────────────────────────

create policy "members can read rentals"
  on rentals for select
  using (studio_id = get_my_studio_id());

create policy "owners and designers can manage rentals"
  on rentals for all
  using (studio_id = get_my_studio_id() and get_my_role() in ('owner', 'designer'));

-- ── Recipes ───────────────────────────────────────────────

create policy "members can read recipes"
  on recipes for select
  using (studio_id = get_my_studio_id());

create policy "owners and designers can manage recipes"
  on recipes for all
  using (studio_id = get_my_studio_id() and get_my_role() in ('owner', 'designer'));

-- Public share token access (no auth required)
create policy "public can read shared recipes via token"
  on recipes for select
  using (share_token_active = true and share_token is not null);

-- ── Recipe Items ──────────────────────────────────────────

create policy "members can read recipe items"
  on recipe_items for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_items.recipe_id
        and r.studio_id = get_my_studio_id()
    )
  );

create policy "owners and designers can manage recipe items"
  on recipe_items for all
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_items.recipe_id
        and r.studio_id = get_my_studio_id()
        and get_my_role() in ('owner', 'designer')
    )
  );

-- Public share token access for recipe items
create policy "public can read recipe items for shared recipes"
  on recipe_items for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_items.recipe_id
        and r.share_token_active = true
        and r.share_token is not null
    )
  );

-- ── Events ────────────────────────────────────────────────

create policy "members can read events"
  on events for select
  using (studio_id = get_my_studio_id());

create policy "owners and designers can manage events"
  on events for all
  using (studio_id = get_my_studio_id() and get_my_role() in ('owner', 'designer'));

-- ── Event Recipes ─────────────────────────────────────────

create policy "members can read event_recipes"
  on event_recipes for select
  using (
    exists (
      select 1 from events e
      where e.id = event_recipes.event_id
        and e.studio_id = get_my_studio_id()
    )
  );

create policy "owners and designers can manage event_recipes"
  on event_recipes for all
  using (
    exists (
      select 1 from events e
      where e.id = event_recipes.event_id
        and e.studio_id = get_my_studio_id()
        and get_my_role() in ('owner', 'designer')
    )
  );

-- ============================================================
-- GRANTS
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these via Supabase dashboard or CLI:
-- supabase storage create flower-images --public
-- supabase storage create studio-assets --public