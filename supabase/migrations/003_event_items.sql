-- ============================================================
-- EVENT ITEMS — Event-level hard goods, rentals, and misc
-- Not tied to any recipe; added directly to an event
-- (e.g. extra vases for a client request)
-- ============================================================

create table event_items (
  id                       uuid primary key default uuid_generate_v4(),
  event_id                 uuid not null references events(id) on delete cascade,x`
  
  item_type                recipe_item_type not null,
  -- Optional catalog refs (null for misc items or if catalog item was deleted)
  hard_good_id             uuid references hard_goods(id) on delete set null,
  rental_id                uuid references rentals(id) on delete set null,
  -- Snapshot of catalog data at time of adding
  item_name                text not null,
  item_unit                item_unit,
  item_image_url           text,
  wholesale_cost_snapshot  numeric(8,4) not null default 0,
  -- Quantity and notes
  quantity                 numeric(8,2) not null default 1,
  notes                    text,
  sort_order               integer not null default 0,
  created_at               timestamptz not null default now(),
  -- Only hard goods, rentals, and misc are valid at event level
  constraint event_items_type_check check (item_type in ('hard_good', 'rental', 'misc'))
);

create index idx_event_items_event_id on event_items(event_id);

-- ── Row Level Security ────────────────────────────────────────

alter table event_items enable row level security;

create policy "members can read event_items"
  on event_items for select
  using (
    exists (
      select 1 from events e
      where e.id = event_items.event_id
        and e.studio_id = get_my_studio_id()
    )
  );

create policy "owners and designers can manage event_items"
  on event_items for all
  using (
    exists (
      select 1 from events e
      where e.id = event_items.event_id
        and e.studio_id = get_my_studio_id()
        and get_my_role() in ('owner', 'designer')
    )
  );

-- ── Grants ───────────────────────────────────────────────────

grant all on event_items to anon, authenticated, service_role;
