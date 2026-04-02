'use server'
import { getMemberOrThrow } from '@/lib/supabase/get-member'
import { revalidatePath } from 'next/cache'
import type { Recipe, RecipeItem } from '@/types/database'

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

export async function saveEventAsTemplate(
  _eventId: string,
  name: string
): Promise<{ data?: Recipe; error?: string }> {
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
        name,
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
