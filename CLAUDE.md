@AGENTS.md

# Petal Recipes — Project Guide

Full-stack SaaS for professional floral design studios.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 16.2.1** (App Router, Server Components) |
| Database | **Supabase** (Postgres + Auth + RLS) |
| Styling | **Tailwind CSS v4** + ShadCN UI |
| Animation | Framer Motion |
| Language | TypeScript (strict) |

## Commands

```bash
npm run dev    # node node_modules/next/dist/bin/next dev
npm run build  # node node_modules/next/dist/bin/next build
```

**Never use `npx next` or `.bin/next`** — `.bin/next` is a broken copy, not a symlink. Always call the dist path directly.

---

## Architecture

### Route Structure

```
app/
  (app)/          # Authenticated routes — layout fetches user+member+studio
    dashboard/
    templates/    # Template library (recipes with is_template = true)
    recipes/
      [id]/       # RecipeBuilder (client, ~1000 lines)
    events/
      [id]/       # EventDetail (client, ~800 lines)
    catalog/
    orders/       # Order Generator
    settings/
  auth/           # Login, onboarding
  share/[token]/  # Public recipe share pages (no auth)
```

### Data Flow

1. **Server Components** fetch data (in `page.tsx` files)
2. **Client Components** receive data as props and handle interactions
3. **Server Actions** (`'use server'` files) handle all mutations
4. **`proxy.ts`** (NOT `middleware.ts`) is the auth guard — Next.js 16 renamed it

### Key Files

| File | Purpose |
|------|---------|
| `proxy.ts` | Auth guard (replaces Next.js middleware) |
| `types/database.ts` | All Supabase DB types (source of truth) |
| `lib/pricing/engine.ts` | Pure pricing functions — no side effects |
| `lib/constants.ts` | Shared constants (EVENT_TYPE_OPTIONS, etc.) |
| `lib/utils.ts` | Shared helpers: `cn`, `formatCurrency`, `formatPct`, etc. |
| `lib/supabase/get-member.ts` | Auth helpers used in layouts + actions |
| `app/(app)/layout.tsx` | Authenticated shell — Server Component |
| `app/(app)/templates/` | Template library — `page.tsx` + `TemplatesLibrary.tsx` + `actions.ts` |
| `components/common/PaletteStrip.tsx` | Color palette row — used in recipes, templates, events |

---

## Local Development

Copy `.env.local` and fill in the Supabase values. To skip the auth/onboarding flow entirely during local dev, set:

```
DEV_BYPASS_AUTH=true
DEV_STUDIO_ID=<your-studio-uuid>
```

This is checked in three places: `proxy.ts` (skips the auth redirect), `app/(app)/layout.tsx` (renders a stub shell), and `get-member.ts` (returns a fake owner member). **All three must check the flag** — if you add a new auth gate, add the bypass there too.

---

## Critical Next.js 16 Differences

- `middleware.ts` → **`proxy.ts`**, export `proxy()` not `middleware()`
- `turbopack.root` must be set in `next.config.ts`
- `cookies()` from `next/headers` is **async** — always `await cookies()`
- Dynamic route `params` and `searchParams` are **async** — always `await params`

---

## TypeScript & Supabase Conventions

### Database Types

- All types live in `types/database.ts`
- Every table **must** include `Relationships: []` — required by `@supabase/postgrest-js` v2.100.1+; without it, all table operations resolve to `never`
- Use `null` not `undefined` for nullable fields in inserts (Supabase Insert types use `null`)
- Cast inserts: `{ ...input, studio_id: studioId } as Database['public']['Tables']['X']['Insert']`

### Server Action Pattern

Each feature directory has an `actions.ts` with `'use server'` at the top.

**Mutation return type convention** — always return `{ error?: string }` or `{ data?: T; error?: string }`:

```typescript
export async function updateThing(id: string, input: Partial<Thing>): Promise<{ error?: string }> {
  try {
    const { studioId, admin } = await getMemberOrThrow()
    const { error } = await admin.from('things').update(input).eq('id', id).eq('studio_id', studioId)
    if (error) return { error: error.message }
    revalidatePath('/things')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
```

**Auth helpers in actions** — define a small private helper at the top of each actions file:

```typescript
// For most actions (no role check needed):
async function getStudio() {
  const { studioId, admin } = await getMemberOrThrow()
  return { supabase: admin, studioId }
}

// For owner-only actions:
async function requireOwner() {
  const { studioId, role, admin } = await getMemberOrThrow()
  if (role !== 'owner') throw new Error('Owner access required')
  return { supabase: admin, studioId }
}
```

**Read-only queries** (Server Components / layouts): use `getMember()` — redirects on failure.
**Mutations** (Server Actions): use `getMemberOrThrow()` — throws on failure.

Both functions are wrapped in React's `cache()` — calling them from both `layout.tsx` and `page.tsx` within the same request costs only one Supabase round-trip. Don't add a separate auth lookup to avoid "double fetching" — just call `getMember()` wherever you need it.

> **Watch:** When real auth is wired up, verify that navigating to any page still loads correctly. If it redirects to `/auth/onboarding` unexpectedly, the `get_my_studio_id()` and `get_my_role()` SQL functions may not exist in the Supabase project yet — recreate them via the SQL editor using the definitions in `supabase/migrations/001_initial.sql` (search for `create or replace function`).

---

## Design System

Colors are defined as CSS variables in `globals.css` under `@theme inline` and available as Tailwind utilities:

| Token | Value | Usage |
|-------|-------|-------|
| `forest` | `#2D5016` | Primary brand, CTAs |
| `cream` | `#FAF7F2` | Page background |
| `blush` | `#E8A598` | Accent, highlights |
| `gold` | `#C9A84C` | Premium accents |
| `body` | `#4A3F35` | Body text |
| `subtle` | `#A89880` | Muted/secondary text |
| `border` | `#E8E0D8` | Borders, dividers |
| `muted` | `#F7F8F8` | Row hover background |
| `row-border` | `#E8EDF2` | Table row bottom border |

Use `text-forest`, `bg-cream`, `border-border`, etc. **Prefer theme tokens over arbitrary hex values.**

> **Note:** Much of the existing codebase uses hardcoded hex values like `text-[#2D5016]`. These are being migrated to tokens as pages are rewritten — don't add new hardcoded hex values, and clean up any you touch during a rewrite.

Fonts: Poppins for everything — `font-sans` and `font-serif` both resolve to Poppins. Playfair Display has been removed.

---

## UI Patterns

The design direction is clean, minimal, and editorial — inspired by Notion and Stripe. No shadows, no decorative borders, tight spacing.

### Cards

- Base: `<Card>` — `rounded-xl bg-white border border-border`, **no shadow**
- Never add `shadow-*` to cards or any other element
- For cards containing a flush table: add `overflow-hidden` to the card

### Buttons

- Standard size: `size="sm"`
- Always add `cursor-pointer` explicitly
- Icon + label gap: `gap-1`
- Example: `<Button size="sm" className="cursor-pointer gap-1"><Icon className="w-3.5 h-3.5" /> Label</Button>`

### Data Tables

Use a native `<table>` element. Pattern:

```tsx
<table className="w-full table-fixed">
  <thead>
    <tr className="border-b border-border">
      <th className="px-4 py-2 text-left text-[12px] font-semibold text-body">Column</th>
    </tr>
  </thead>
  <tbody>
    <ClickableRow href="/path" className="hover:bg-muted">
      <td className="px-4 py-2 font-medium text-body">Primary value</td>
      <td className="px-4 py-2 text-subtle">Secondary value</td>
    </ClickableRow>
  </tbody>
</table>
```

Key rules:
- `table-fixed` — equal column widths regardless of content, scales automatically as columns are added
- Header: `text-[12px] font-semibold text-body`, `border-b border-border` on the `<tr>`
- Rows: `text-[14px]` (set in `ClickableRow`), `border-b border-row-border last:border-0`, `hover:bg-muted`
- Primary cell: `font-medium text-body`
- Secondary cells: `text-subtle`
- Clickable rows: use `<ClickableRow href="...">` from `components/common/ClickableRow.tsx` — do not use duplicate `<Link>` tags per cell

### Page Headers

```tsx
<div className="mb-6 flex items-center justify-between">
  <h1 className="font-serif text-2xl font-semibold text-forest">Page title</h1>
  <Button size="sm" className="cursor-pointer gap-1">...</Button>
</div>
```

### Table Cards (header + table combo)

```tsx
<Card className="overflow-hidden">
  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
    <span className="text-sm font-semibold">Section Title</span>
    <Link href="/path"><Button variant="ghost" size="sm" className="text-xs h-7 px-2">View all</Button></Link>
  </div>
  <table className="w-full table-fixed">...</table>
</Card>
```

---

## Pricing Engine

`lib/pricing/engine.ts` is a **pure function module** — no imports from Next.js, Supabase, or React. All inputs and outputs are typed via `lib/pricing/types.ts`.

Key functions:
- `calculatePricingWaterfall(items, settings)` — full build-up pricing
- `calculateWorkBack(items, settings)` — reverse from target retail
- `calculateEventSummary(recipes, settings)` — aggregate event pricing
- `calculateBunchesNeeded(stems, stemsPerBunch, bufferPct)` — order quantities

`formatCurrency` and `formatPct` are defined in `lib/utils.ts` and re-exported from the engine for convenience. Do not duplicate them anywhere.

---

## Shared Constants

`lib/constants.ts` is the source of truth for:
- `EVENT_TYPE_OPTIONS` — `{ value, label }[]` array for `<Select>` inputs
- `EVENT_TYPE_LABELS` — `Record<string, string>` derived from above for read-only display

**Always import from `@/lib/constants`. Never redefine locally.**

---

## Database Schema Summary

```
studios            — studio name, currency, timezone
studio_members     — user ↔ studio with role (owner | designer | staff)
studio_settings    — default markups, labor rates, waste buffer, etc.
flowers            — catalog: name, variety, color, cost/stem, stems/bunch
hard_goods         — catalog: name, unit, cost
rentals            — catalog: name, cost, uses_per_rental
recipes            — floral recipe with pricing settings
                     is_template: bool — true = appears in /templates
                     style_tags: text[] — e.g. ['garden', 'romantic'] (migration 004)
recipe_items       — line items (flower | hard_good | rental | misc)
events             — client events
event_recipes      — junction: event ↔ recipe (with quantity)
event_items        — ad-hoc line items on events
```

Full schema with RLS: `supabase/migrations/001_initial.sql`

---

## Templates System

`/templates` shows only recipes where `is_template = true`. The recipe builder (`/recipes/[id]`) has a Template toggle in the header that sets this flag and saves immediately (bypassing the autosave debounce).

**"Use Template" flow:** creates a fresh recipe copy (`is_template = false`) with all items, links it to the selected event via `event_recipes`, then revalidates both `/templates` and `/events/[id]`.

**Cross-route revalidation:** any mutation that changes `is_template` or recipe status must call `revalidatePath('/templates')` in addition to `/recipes`.

**Style tags:** stored as `text[]` on the `recipes` table (migration `004_style_tags.sql`). The templates page gracefully falls back to a query without `style_tags` if the migration hasn't been applied yet — remove that fallback once confirmed deployed.

---

## What NOT to Do

- Don't run `npx next` or `.bin/next` — use `node node_modules/next/dist/bin/next`
- Don't create `middleware.ts` — this project uses `proxy.ts`
- Don't duplicate `formatCurrency`/`formatPct` — import from `@/lib/utils` or `@/lib/pricing/engine`
- Don't redefine `EVENT_TYPE_OPTIONS` or `EVENT_TYPE_LABELS` locally — import from `@/lib/constants`
- Don't omit `Relationships: []` on new DB types — Supabase will resolve queries to `never`
- Don't use `undefined` for nullable DB fields in inserts — use `null`
- Don't expose `SUPABASE_SERVICE_ROLE_KEY` to the client — admin client is server-only
- Don't use `useState` for DOM side effects (`window`, `document`) — use `useEffect`; `useState` initializers run on the server during SSR even in `'use client'` components
- Don't use the autosave debounce (`updateLocal`) for deliberate one-click actions — call `updateRecipe` directly for toggles and explicit saves
- Don't use `window.location.reload()` to refresh data — use `router.refresh()` from `next/navigation`, which re-runs the Server Component tree without a full page reload
- Don't add new hardcoded hex values (e.g. `text-[#2D5016]`) — use design token classes (`text-forest`, etc.)
- Don't add wrapper divs that only exist to pass props or apply a single CSS property — if a ShadCN component like `CardContent` is only adding padding that you're immediately overriding, put the padding directly on the parent and skip the wrapper. Always ask: does this element do anything the parent couldn't do with one extra class?
