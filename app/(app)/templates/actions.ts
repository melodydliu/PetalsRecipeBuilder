'use server'
import { getMemberOrThrow } from '@/lib/supabase/get-member'
import { revalidatePath } from 'next/cache'
import type { Recipe, RecipeItem, EventItem } from '@/types/database'

export async function duplicateTemplate(id: string): Promise<{ data?: Recipe; error?: string }> {
  try {
    const { supabase, studioId } = await getStudio()

    const { data: original } = await supabase
      .from('recipes')
      .select('*, recipe_items(*)')
      .eq('id', id)
      .eq('studio_id', studioId)
      .single()

    if (!original) return { error: 'Template not found' }

    const { data: newRecipe, error } = await supabase
      .from('recipes')
      .insert({
        studio_id: studioId,
        name: `${original.name} (Copy)`,
        event_type: original.event_type,
        description: original.description,
        flower_markup: original.flower_markup,
        hardgoods_markup: original.hardgoods_markup,
        rental_markup: original.rental_markup,
        labor_mode: original.labor_mode,
        design_fee_pct: original.design_fee_pct,
        prep_hours: original.prep_hours,
        prep_rate: original.prep_rate,
        design_hours: original.design_hours,
        design_rate: original.design_rate,
        pricing_mode: original.pricing_mode,
        target_retail_price: original.target_retail_price,
        status: 'draft',
        is_template: true,
        style_tags: original.style_tags ?? [],
        share_token_active: false,
        notes: original.notes,
        moodboard_url: original.moodboard_url,
        image_url: original.image_url,
      })
      .select()
      .single()

    if (error || !newRecipe) return { error: error?.message ?? 'Failed to duplicate' }

    if (original.recipe_items?.length) {
      const items = (original.recipe_items as RecipeItem[]).map(
        ({ id: _id, recipe_id: _rid, created_at: _ca, ...item }) => ({
          ...item,
          recipe_id: newRecipe.id,
        })
      )
      await supabase.from('recipe_items').insert(items)
    }

    revalidatePath('/templates')
    return { data: newRecipe as Recipe }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function archiveTemplate(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudio()
    const { error } = await supabase
      .from('recipes')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('studio_id', studioId)
    if (error) return { error: error.message }
    revalidatePath('/templates')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

async function getStudio() {
  const { studioId, admin } = await getMemberOrThrow()
  return { supabase: admin, studioId }
}

export async function createTemplate(): Promise<{ data?: Recipe; error?: string }> {
  try {
    const { supabase, studioId } = await getStudio()

    const { data: settings } = await supabase
      .from('studio_settings')
      .select('*')
      .eq('studio_id', studioId)
      .single()

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        studio_id: studioId,
        name: 'Untitled Template',
        status: 'draft',
        is_template: true,
        pricing_mode: 'work_back',
        flower_markup: settings?.default_flower_markup,
        hardgoods_markup: settings?.default_hardgoods_markup,
        rental_markup: settings?.default_rental_markup,
        labor_mode: settings?.default_labor_mode,
        design_fee_pct: settings?.default_design_fee_pct,
        prep_rate: settings?.default_prep_rate,
        design_rate: settings?.default_design_rate,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    revalidatePath('/templates')
    return { data: data as Recipe }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── Event Template Actions ────────────────────────────────────

type EventWithRecipes = {
  id: string
  notes: string | null
  delivery_fee: number | null
  setup_fee: number | null
  teardown_fee: number | null
  delivery_fee_type: string | null
  setup_fee_type: string | null
  teardown_fee_type: string | null
  tax_rate: number | null
  margin_target: number | null
  event_recipes: {
    id: string
    quantity: number
    override_retail_price: number | null
    sort_order: number
    recipes: Recipe & { recipe_items: RecipeItem[] }
  }[]
  event_items: EventItem[]
}

async function duplicateEventRecipes(
  supabase: Awaited<ReturnType<typeof getStudio>>['supabase'],
  studioId: string,
  sourceEventRecipes: EventWithRecipes['event_recipes'],
  newEventId: string
) {
  for (const er of sourceEventRecipes) {
    const { data: newRecipe } = await supabase
      .from('recipes')
      .insert({
        studio_id: studioId,
        name: er.recipes.name,
        event_type: er.recipes.event_type,
        description: er.recipes.description,
        flower_markup: er.recipes.flower_markup,
        hardgoods_markup: er.recipes.hardgoods_markup,
        rental_markup: er.recipes.rental_markup,
        labor_mode: er.recipes.labor_mode,
        design_fee_pct: er.recipes.design_fee_pct,
        prep_hours: er.recipes.prep_hours,
        prep_rate: er.recipes.prep_rate,
        design_hours: er.recipes.design_hours,
        design_rate: er.recipes.design_rate,
        pricing_mode: er.recipes.pricing_mode,
        target_retail_price: er.recipes.target_retail_price,
        status: 'draft',
        is_template: false,
        style_tags: er.recipes.style_tags ?? [],
        share_token_active: false,
        notes: er.recipes.notes,
        moodboard_url: er.recipes.moodboard_url,
        image_url: er.recipes.image_url,
      })
      .select()
      .single()

    if (!newRecipe) continue

    if (er.recipes.recipe_items?.length) {
      const items = (er.recipes.recipe_items as RecipeItem[]).map(
        ({ id: _id, recipe_id: _rid, created_at: _ca, ...item }) => ({
          ...item,
          recipe_id: newRecipe.id,
        })
      )
      await supabase.from('recipe_items').insert(items)
    }

    await supabase.from('event_recipes').insert({
      event_id: newEventId,
      recipe_id: newRecipe.id,
      quantity: er.quantity,
      override_retail_price: er.override_retail_price,
      sort_order: er.sort_order,
    })
  }
}

export async function saveEventAsTemplate(
  eventId: string,
  templateName: string
): Promise<{ data?: { id: string }; error?: string }> {
  try {
    const { supabase, studioId } = await getStudio()

    const { data: source, error: fetchError } = await supabase
      .from('events')
      .select('*, event_recipes(id, quantity, override_retail_price, sort_order, recipes(*, recipe_items(*))), event_items(*)')
      .eq('id', eventId)
      .eq('studio_id', studioId)
      .single()

    if (fetchError || !source) return { error: fetchError?.message ?? 'Event not found' }

    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        studio_id: studioId,
        name: templateName,
        is_template: true,
        notes: source.notes,
        delivery_fee: source.delivery_fee,
        setup_fee: source.setup_fee,
        teardown_fee: source.teardown_fee,
        delivery_fee_type: source.delivery_fee_type as 'flat' | 'percentage' | null,
        setup_fee_type: source.setup_fee_type as 'flat' | 'percentage' | null,
        teardown_fee_type: source.teardown_fee_type as 'flat' | 'percentage' | null,
        tax_rate: source.tax_rate,
        margin_target: source.margin_target,
        client_name: null,
        event_date: null,
        venue: null,
      })
      .select()
      .single()

    if (error || !newEvent) return { error: error?.message ?? 'Failed to create template' }

    const sourceTyped = source as unknown as EventWithRecipes
    await duplicateEventRecipes(supabase, studioId, sourceTyped.event_recipes, newEvent.id)

    if (sourceTyped.event_items?.length) {
      const eventItems = (sourceTyped.event_items as EventItem[]).map(
        ({ id: _id, created_at: _ca, event_id: _eid, ...item }) => ({
          ...item,
          event_id: newEvent.id,
        })
      )
      await supabase.from('event_items').insert(eventItems)
    }

    revalidatePath('/templates')
    return { data: { id: newEvent.id } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function useEventTemplate(
  templateEventId: string
): Promise<{ data?: { id: string }; error?: string }> {
  try {
    const { supabase, studioId } = await getStudio()

    const { data: template, error: fetchError } = await supabase
      .from('events')
      .select('*, event_recipes(id, quantity, override_retail_price, sort_order, recipes(*, recipe_items(*))), event_items(*)')
      .eq('id', templateEventId)
      .eq('studio_id', studioId)
      .single()

    if (fetchError || !template) return { error: fetchError?.message ?? 'Template not found' }

    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        studio_id: studioId,
        name: template.name ?? 'New Event',
        is_template: false,
        notes: template.notes,
        delivery_fee: template.delivery_fee,
        setup_fee: template.setup_fee,
        teardown_fee: template.teardown_fee,
        delivery_fee_type: template.delivery_fee_type as 'flat' | 'percentage' | null,
        setup_fee_type: template.setup_fee_type as 'flat' | 'percentage' | null,
        teardown_fee_type: template.teardown_fee_type as 'flat' | 'percentage' | null,
        tax_rate: template.tax_rate,
        margin_target: template.margin_target,
        client_name: null,
        event_date: null,
        venue: null,
      })
      .select()
      .single()

    if (error || !newEvent) return { error: error?.message ?? 'Failed to create event' }

    const templateTyped = template as unknown as EventWithRecipes
    await duplicateEventRecipes(supabase, studioId, templateTyped.event_recipes, newEvent.id)

    if (templateTyped.event_items?.length) {
      const eventItems = (templateTyped.event_items as EventItem[]).map(
        ({ id: _id, created_at: _ca, event_id: _eid, ...item }) => ({
          ...item,
          event_id: newEvent.id,
        })
      )
      await supabase.from('event_items').insert(eventItems)
    }

    revalidatePath('/events')
    return { data: { id: newEvent.id } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteEventTemplate(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudio()

    // Fetch recipe IDs linked to this template event
    const { data: eventRecipes } = await supabase
      .from('event_recipes')
      .select('recipe_id')
      .eq('event_id', id)

    // Delete the template event (cascades event_recipes and event_items)
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('studio_id', studioId)
      .eq('is_template', true)

    if (error) return { error: error.message }

    // Delete the copied recipes (and their recipe_items via cascade)
    if (eventRecipes?.length) {
      const recipeIds = eventRecipes.map(er => er.recipe_id)
      await supabase.from('recipes').delete().in('id', recipeIds).eq('studio_id', studioId)
    }

    revalidatePath('/templates')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateStyleTags(recipeId: string, styles: string[]): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudio()
    const { error } = await supabase
      .from('recipes')
      .update({ style_tags: styles })
      .eq('id', recipeId)
      .eq('studio_id', studioId)
    if (error) return { error: error.message }
    revalidatePath('/templates')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function useTemplateForEvent(
  templateId: string,
  eventId: string
): Promise<{ data?: Recipe; error?: string }> {
  try {
    const { supabase, studioId } = await getStudio()

    // Fetch template + items
    const { data: template } = await supabase
      .from('recipes')
      .select('*, recipe_items(*)')
      .eq('id', templateId)
      .eq('studio_id', studioId)
      .single()

    if (!template) return { error: 'Template not found' }

    // Duplicate recipe — not a template, linked to event
    const { data: newRecipe, error: createErr } = await supabase
      .from('recipes')
      .insert({
        studio_id: studioId,
        name: template.name,
        event_type: template.event_type,
        description: template.description,
        flower_markup: template.flower_markup,
        hardgoods_markup: template.hardgoods_markup,
        rental_markup: template.rental_markup,
        labor_mode: template.labor_mode,
        design_fee_pct: template.design_fee_pct,
        prep_hours: template.prep_hours,
        prep_rate: template.prep_rate,
        design_hours: template.design_hours,
        design_rate: template.design_rate,
        pricing_mode: template.pricing_mode,
        target_retail_price: template.target_retail_price,
        status: 'draft',
        is_template: false,
        style_tags: template.style_tags,
        share_token_active: false,
        notes: template.notes,
        moodboard_url: template.moodboard_url,
        image_url: template.image_url,
      })
      .select()
      .single()

    if (createErr || !newRecipe) return { error: createErr?.message ?? 'Failed to create recipe' }

    // Copy items
    if (template.recipe_items?.length) {
      const items = (template.recipe_items as RecipeItem[]).map(
        ({ id: _id, recipe_id: _rid, created_at: _ca, ...item }) => ({
          ...item,
          recipe_id: newRecipe.id,
        })
      )
      const { error: itemsErr } = await supabase.from('recipe_items').insert(items)
      if (itemsErr) return { error: itemsErr.message }
    }

    // Link to event
    const { error: linkErr } = await supabase
      .from('event_recipes')
      .insert({ event_id: eventId, recipe_id: newRecipe.id, quantity: 1 })

    if (linkErr) return { error: linkErr.message }

    revalidatePath('/templates')
    revalidatePath(`/events/${eventId}`)
    return { data: newRecipe as Recipe }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
