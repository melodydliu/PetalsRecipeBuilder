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
| `muted` | `#F5F1EC` | Table headers, surfaces |

Use `text-forest`, `bg-cream`, `border-border`, etc. **Prefer theme tokens over arbitrary hex values.**

Fonts: `font-serif` (Playfair Display, headings) · `font-sans` (Inter, body)

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
recipe_items       — line items (flower | hard_good | rental | misc)
events             — client events
event_recipes      — junction: event ↔ recipe (with quantity)
event_items        — ad-hoc line items on events
```

Full schema with RLS: `supabase/migrations/001_initial.sql`

---

## What NOT to Do

- Don't run `npx next` or `.bin/next` — use `node node_modules/next/dist/bin/next`
- Don't create `middleware.ts` — this project uses `proxy.ts`
- Don't duplicate `formatCurrency`/`formatPct` — import from `@/lib/utils` or `@/lib/pricing/engine`
- Don't redefine `EVENT_TYPE_OPTIONS` or `EVENT_TYPE_LABELS` locally — import from `@/lib/constants`
- Don't omit `Relationships: []` on new DB types — Supabase will resolve queries to `never`
- Don't use `undefined` for nullable DB fields in inserts — use `null`
- Don't expose `SUPABASE_SERVICE_ROLE_KEY` to the client — admin client is server-only
