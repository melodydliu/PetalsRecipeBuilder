import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { TemplatesLibrary } from './TemplatesLibrary'
import type { EventTemplateItem } from './EventTemplatesTab'

export const metadata = { title: 'Templates — Petal' }

const RECIPE_FIELDS = 'id, name, event_type, updated_at, recipe_items(item_color_hex, item_color_name, item_type)'

async function getData() {
  const { studioId } = await getMember()
  const admin = createAdminClient()

  const baseQuery = () =>
    admin
      .from('recipes')
      .select(RECIPE_FIELDS)
      .eq('studio_id', studioId)
      .eq('is_template', true)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })

  const [recipesResult, eventsResult, rawTemplatesResult] = await Promise.all([
    // Try with style_tags; if the column doesn't exist yet, fall back without it
    admin
      .from('recipes')
      .select(`style_tags, ${RECIPE_FIELDS}`)
      .eq('studio_id', studioId)
      .eq('is_template', true)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false }),
    admin
      .from('events')
      .select('id, name, client_name, event_date')
      .eq('studio_id', studioId)
      .eq('is_template', false)
      .order('event_date', { ascending: true }),
    // Fetch ALL studio events and filter in JS — avoids PostgREST schema cache
    // issues with newly-added columns
    admin
      .from('events')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false }),
  ])

  // style_tags column may not exist yet (migration pending) — fall back gracefully
  const recipes = recipesResult.error
    ? (await baseQuery()).data ?? []
    : (recipesResult.data ?? [])

  const events = eventsResult.data ?? []

  // Filter templates in JS so PostgREST schema cache for `is_template` is not required
  const allStudioEvents = rawTemplatesResult.data ?? []
  const rawTemplates = allStudioEvents.filter(
    e => (e as { is_template?: boolean }).is_template === true
  )

  const eventTemplateQueryError = rawTemplatesResult.error?.message ?? null

  // Fetch recipe names for each event template separately
  const recipesByEventId: Record<string, { id: string; name: string }[]> = {}
  if (rawTemplates.length) {
    const templateIds = rawTemplates.map(t => t.id)
    const { data: eventRecipes } = await admin
      .from('event_recipes')
      .select('event_id, recipes(id, name)')
      .in('event_id', templateIds)

    for (const er of eventRecipes ?? []) {
      const recipe = (er.recipes as { id: string; name: string } | null)
      if (recipe) {
        recipesByEventId[er.event_id] = [...(recipesByEventId[er.event_id] ?? []), recipe]
      }
    }
  }

  const eventTemplates: EventTemplateItem[] = rawTemplates.map(et => {
    const linked = recipesByEventId[et.id] ?? []
    return {
      id: et.id,
      name: et.name,
      notes: et.notes,
      recipeCount: linked.length,
      recipeNames: linked.slice(0, 3).map(r => r.name),
      deliveryFee: et.delivery_fee,
      setupFee: et.setup_fee,
      teardownFee: et.teardown_fee,
      taxRate: et.tax_rate,
      updatedAt: et.created_at,
    }
  })

  return { recipes, events, eventTemplates, eventTemplateQueryError }
}

type RecipeItem = { item_color_hex: string | null; item_color_name: string | null; item_type: string }

export default async function TemplatesPage() {
  const { recipes, events, eventTemplates, eventTemplateQueryError } = await getData()

  const templates = recipes.map(r => ({
    id: r.id,
    name: r.name,
    itemType: r.event_type ?? null,
    styles: ('style_tags' in r ? (r.style_tags as string[]) : null) ?? [],
    colors: (r.recipe_items as RecipeItem[])
      .filter(ri => ri.item_type === 'flower')
      .map(ri => ({ hex: ri.item_color_hex, name: ri.item_color_name })),
    updatedAt: r.updated_at,
  }))

  return (
    <TemplatesLibrary
      initialTemplates={templates}
      events={events}
      initialEventTemplates={eventTemplates}
      eventTemplateQueryError={eventTemplateQueryError}
    />
  )
}
