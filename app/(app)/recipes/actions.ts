'use server'
import { getMemberOrThrow } from '@/lib/supabase/get-member'
import { revalidatePath } from 'next/cache'
import type { Recipe, RecipeItem, Database } from '@/types/database'

async function getStudioAndRole() {
  const { studioId, role, admin } = await getMemberOrThrow()
  return { supabase: admin, studioId, role }
}

export async function getRecipes() {
  const { supabase, studioId } = await getStudioAndRole()
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('studio_id', studioId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as Recipe[]
}

export async function getRecipe(id: string) {
  const { supabase, studioId } = await getStudioAndRole()
  const { data, error } = await supabase
    .from('recipes')
    .select('*, recipe_items(*)')
    .eq('id', id)
    .eq('studio_id', studioId)
    .single()
  if (error) throw error
  return data as Recipe & { recipe_items: RecipeItem[] }
}

export async function createRecipe(input?: Partial<Recipe>): Promise<{ data?: Recipe; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioAndRole()

    // Get studio settings for defaults
    const { data: settings } = await supabase
      .from('studio_settings')
      .select('*')
      .eq('studio_id', studioId)
      .single()

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        studio_id: studioId,
        name: input?.name ?? 'Untitled Recipe',
        status: 'draft',
        pricing_mode: 'work_back',
        flower_markup: settings?.default_flower_markup,
        hardgoods_markup: settings?.default_hardgoods_markup,
        rental_markup: settings?.default_rental_markup,
        labor_mode: settings?.default_labor_mode,
        design_fee_pct: settings?.default_design_fee_pct,
        prep_rate: settings?.default_prep_rate,
        design_rate: settings?.default_design_rate,
        ...input,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    revalidatePath('/recipes')
    return { data: data as Recipe }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateRecipe(id: string, input: Partial<Recipe>): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioAndRole()
    const { error } = await supabase
      .from('recipes')
      .update(input)
      .eq('id', id)
      .eq('studio_id', studioId)
    if (error) return { error: error.message }
    revalidatePath(`/recipes/${id}`)
    revalidatePath('/recipes')
    revalidatePath('/templates')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function duplicateRecipe(id: string): Promise<{ data?: Recipe; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioAndRole()

    // Get original recipe with items
    const { data: original } = await supabase
      .from('recipes')
      .select('*, recipe_items(*)')
      .eq('id', id)
      .eq('studio_id', studioId)
      .single()

    if (!original) return { error: 'Recipe not found' }

    // Create new recipe (omit join fields and auto-generated fields)
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
        is_template: original.is_template,
        style_tags: original.style_tags,
        share_token_active: false,
        notes: original.notes,
        moodboard_url: original.moodboard_url,
        image_url: original.image_url,
      })
      .select()
      .single()

    if (error || !newRecipe) return { error: error?.message ?? 'Failed to duplicate' }

    // Copy recipe items
    if (original.recipe_items?.length) {
      const items = original.recipe_items.map(({ id: _id, recipe_id: _rid, created_at: _ca, ...item }: RecipeItem) => ({
        ...item,
        recipe_id: newRecipe.id,
      }))
      await supabase.from('recipe_items').insert(items)
    }

    revalidatePath('/recipes')
    revalidatePath('/templates')
    return { data: newRecipe as Recipe }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function archiveRecipe(id: string): Promise<{ error?: string }> {
  return updateRecipe(id, { status: 'archived' })
}

export async function toggleShareToken(id: string, active: boolean): Promise<{ shareToken?: string; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioAndRole()
    const { data, error } = await supabase
      .from('recipes')
      .update({ share_token_active: active })
      .eq('id', id)
      .eq('studio_id', studioId)
      .select('share_token')
      .single()

    if (error) return { error: error.message }
    return { shareToken: data.share_token ?? undefined }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Recipe Items ─────────────────────────────────────────────

export async function addRecipeItem(
  recipeId: string,
  item: Partial<RecipeItem>
): Promise<{ data?: RecipeItem; error?: string }> {
  try {
    const { supabase } = await getStudioAndRole()
    const { data, error } = await supabase
      .from('recipe_items')
      .insert({ ...item, recipe_id: recipeId } as Database['public']['Tables']['recipe_items']['Insert'])
      .select()
      .single()
    if (error) return { error: error.message }
    return { data: data as RecipeItem }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateRecipeItem(
  id: string,
  input: Partial<RecipeItem>
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioAndRole()
    const { error } = await supabase.from('recipe_items').update(input).eq('id', id)
    if (error) return { error: error.message }
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removeRecipeItem(id: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioAndRole()
    const { error } = await supabase.from('recipe_items').delete().eq('id', id)
    if (error) return { error: error.message }
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function reorderRecipeItems(
  updates: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioAndRole()
    for (const u of updates) {
      await supabase.from('recipe_items').update({ sort_order: u.sort_order }).eq('id', u.id)
    }
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
