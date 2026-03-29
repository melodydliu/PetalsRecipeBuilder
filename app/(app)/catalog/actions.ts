'use server'
import { getMemberOrThrow } from '@/lib/supabase/get-member'
import { revalidatePath } from 'next/cache'
import type { Flower, HardGood, Rental, Database } from '@/types/database'

// ── Helpers ─────────────────────────────────────────────────

async function getStudioId() {
  const { studioId, admin } = await getMemberOrThrow()
  return { supabase: admin, studioId }
}

// ── FLOWERS ─────────────────────────────────────────────────

export async function getFlowers() {
  const { supabase, studioId } = await getStudioId()
  const { data, error } = await supabase
    .from('flowers')
    .select('*')
    .eq('studio_id', studioId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as Flower[]
}

export async function createFlower(input: Partial<Flower>): Promise<{ data?: Flower; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { data, error } = await supabase
      .from('flowers')
      .insert({ ...input, studio_id: studioId } as Database['public']['Tables']['flowers']['Insert'])
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/catalog')
    return { data: data as Flower }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateFlower(
  id: string,
  input: Partial<Flower>
): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { error } = await supabase
      .from('flowers')
      .update(input)
      .eq('id', id)
      .eq('studio_id', studioId)
    if (error) return { error: error.message }
    revalidatePath('/catalog')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteFlower(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    await supabase
      .from('flowers')
      .update({ is_active: false })
      .eq('id', id)
      .eq('studio_id', studioId)
    revalidatePath('/catalog')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// Catalog Price Push: update price + offer to push to draft recipes
export async function updateFlowerPrice(
  flowerId: string,
  newCostPerStem: number
): Promise<{ draftRecipeCount: number; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()

    await supabase
      .from('flowers')
      .update({ wholesale_cost_per_stem: newCostPerStem })
      .eq('id', flowerId)
      .eq('studio_id', studioId)

    // Count draft recipes containing this flower
    const { count } = await supabase
      .from('recipe_items')
      .select('recipe_id', { count: 'exact', head: true })
      .eq('flower_id', flowerId)
      .not('recipe_id', 'is', null)

    // Get draft recipe count specifically
    const { data: draftItems } = await supabase
      .from('recipe_items')
      .select('recipe_id, recipes!inner(status, studio_id)')
      .eq('flower_id', flowerId)
      .eq('recipes.status', 'draft')
      .eq('recipes.studio_id', studioId)

    const uniqueDraftRecipes = new Set(draftItems?.map(i => i.recipe_id) ?? [])
    revalidatePath('/catalog')
    return { draftRecipeCount: uniqueDraftRecipes.size }
  } catch (e) {
    return { draftRecipeCount: 0, error: (e as Error).message }
  }
}

export async function pushPriceToRecipes(
  flowerId: string,
  newCostPerStem: number
): Promise<{ updatedCount: number; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()

    // Get draft recipe items for this flower
    const { data: items } = await supabase
      .from('recipe_items')
      .select('id, recipes!inner(status, studio_id)')
      .eq('flower_id', flowerId)
      .eq('recipes.status', 'draft')
      .eq('recipes.studio_id', studioId)

    if (!items?.length) return { updatedCount: 0 }

    const ids = items.map(i => i.id)
    await supabase
      .from('recipe_items')
      .update({ wholesale_cost_snapshot: newCostPerStem })
      .in('id', ids)

    revalidatePath('/recipes')
    return { updatedCount: ids.length }
  } catch (e) {
    return { updatedCount: 0, error: (e as Error).message }
  }
}

// ── HARD GOODS ──────────────────────────────────────────────

export async function getHardGoods() {
  const { supabase, studioId } = await getStudioId()
  const { data, error } = await supabase
    .from('hard_goods')
    .select('*')
    .eq('studio_id', studioId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as HardGood[]
}

export async function createHardGood(input: Partial<HardGood>): Promise<{ data?: HardGood; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { data, error } = await supabase
      .from('hard_goods')
      .insert({ ...input, studio_id: studioId } as Database['public']['Tables']['hard_goods']['Insert'])
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/catalog')
    return { data: data as HardGood }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateHardGood(id: string, input: Partial<HardGood>): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { error } = await supabase.from('hard_goods').update(input).eq('id', id).eq('studio_id', studioId)
    if (error) return { error: error.message }
    revalidatePath('/catalog')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteHardGood(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    await supabase.from('hard_goods').update({ is_active: false }).eq('id', id).eq('studio_id', studioId)
    revalidatePath('/catalog')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── RENTALS ─────────────────────────────────────────────────

export async function getRentals() {
  const { supabase, studioId } = await getStudioId()
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .eq('studio_id', studioId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as Rental[]
}

export async function createRental(input: Partial<Rental>): Promise<{ data?: Rental; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { data, error } = await supabase
      .from('rentals')
      .insert({ ...input, studio_id: studioId } as Database['public']['Tables']['rentals']['Insert'])
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/catalog')
    return { data: data as Rental }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateRental(id: string, input: Partial<Rental>): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { error } = await supabase.from('rentals').update(input).eq('id', id).eq('studio_id', studioId)
    if (error) return { error: error.message }
    revalidatePath('/catalog')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteRental(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    await supabase.from('rentals').update({ is_active: false }).eq('id', id).eq('studio_id', studioId)
    revalidatePath('/catalog')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── SEED from master library ────────────────────────────────

export async function seedFromMasterLibrary(
  entries: Array<{
    name: string; variety: string; color_name: string; color_hex: string
    unit: 'stem' | 'bunch' | 'box'; stems_per_bunch: number
    wholesale_cost_per_stem: number; seasonal_months: number[]; notes: string
  }>
): Promise<{ count: number; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()

    const rows = entries.map(e => ({
      studio_id: studioId,
      name: e.name,
      variety: e.variety,
      color_name: e.color_name,
      color_hex: e.color_hex,
      unit: e.unit,
      stems_per_bunch: e.stems_per_bunch,
      wholesale_cost_per_stem: e.wholesale_cost_per_stem,
      seasonal_months: e.seasonal_months,
      notes: e.notes,
      is_active: true,
    }))

    const { data, error } = await supabase
      .from('flowers')
      .insert(rows)
      .select()

    if (error) return { count: 0, error: error.message }
    revalidatePath('/catalog')
    return { count: data.length }
  } catch (e) {
    return { count: 0, error: (e as Error).message }
  }
}
