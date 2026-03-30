-- ============================================================
-- EVENT QUOTE ITEMS — Client-facing proposal line items
-- Grouped by category (Personals, Ceremony, etc.)
-- Represents the quoting step before recipe creation.
-- ============================================================

create table event_quote_items (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null references events(id) on delete cascade,
  category        text not null default 'Personals',
  item_name       text not null,
  quantity        numeric(8,2) not null default 1,
  -- For regular items: retail price per unit (client-facing)
  -- For service fee items: flat dollar amount OR percentage rate (e.g. 10 = 10%)
  unit_price      numeric(10,2) not null default 0,
  -- null for regular items; 'flat' or 'percentage' for service fee category items
  fee_type        text check (fee_type in ('flat', 'percentage')),
  notes           text,
  sort_order      integer not null default 0,
  -- Populated when user creates a recipe from this quote item
  recipe_id       uuid references recipes(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_event_quote_items_event_id on event_quote_items(event_id);
create index idx_event_quote_items_recipe_id on event_quote_items(recipe_id);

-- ── Row Level Security ────────────────────────────────────────

alter table event_quote_items enable row level security;

create policy "members can read event_quote_items"
  on event_quote_items for select
  using (
    exists (
      select 1 from events e
      where e.id = event_quote_items.event_id
        and e.studio_id = get_my_studio_id()
    )
  );

create policy "owners and designers can manage event_quote_items"
  on event_quote_items for all
  using (
    exists (
      select 1 from events e
      where e.id = event_quote_items.event_id
        and e.studio_id = get_my_studio_id()
        and get_my_role() in ('owner', 'designer')
    )
  );

-- ── Grants ───────────────────────────────────────────────────

grant all on event_quote_items to anon, authenticated, service_role;
