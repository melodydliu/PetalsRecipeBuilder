import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { TemplatesLibrary } from './TemplatesLibrary'

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

  const [recipesResult, { data: events }] = await Promise.all([
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
      .order('event_date', { ascending: true }),
  ])

  // style_tags column may not exist yet (migration pending) — fall back gracefully
  const recipes = recipesResult.error
    ? (await baseQuery()).data ?? []
    : (recipesResult.data ?? [])

  return { recipes, events: events ?? [] }
}

type RecipeItem = { item_color_hex: string | null; item_color_name: string | null; item_type: string }

export default async function TemplatesPage() {
  const { recipes, events } = await getData()

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

  return <TemplatesLibrary initialTemplates={templates} events={events} />
}
