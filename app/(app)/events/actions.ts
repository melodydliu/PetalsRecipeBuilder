'use server'
import { getMemberOrThrow } from '@/lib/supabase/get-member'
import { revalidatePath } from 'next/cache'
import type { Event, EventStatus, EventItem, EventQuoteItem, Database } from '@/types/database'

async function getStudioId() {
  const { studioId, admin } = await getMemberOrThrow()
  return { supabase: admin, studioId }
}

export async function createEvent(input: Partial<Event>): Promise<{ data?: Event; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { data, error } = await supabase
      .from('events')
      .insert({ ...input, studio_id: studioId } as Database['public']['Tables']['events']['Insert'])
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/events')
    return { data: data as Event }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateEvent(id: string, input: Partial<Event>): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { error } = await supabase.from('events').update(input).eq('id', id).eq('studio_id', studioId)
    if (error) return { error: error.message }
    revalidatePath('/events')
    revalidatePath(`/events/${id}`)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    await supabase.from('events').delete().eq('id', id).eq('studio_id', studioId)
    revalidatePath('/events')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function cycleEventStatus(id: string, currentStatus: EventStatus): Promise<{ newStatus: EventStatus; error?: string }> {
  const cycle: EventStatus[] = ['to_do', 'in_progress', 'ordered', 'complete']
  const nextIdx = (cycle.indexOf(currentStatus) + 1) % cycle.length
  const newStatus = cycle[nextIdx]
  const result = await updateEvent(id, { recipe_status: newStatus })
  return { newStatus, ...result }
}

export async function addRecipeToEvent(eventId: string, recipeId: string, quantity = 1): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioId()
    const { error } = await supabase
      .from('event_recipes')
      .insert({ event_id: eventId, recipe_id: recipeId, quantity })
    if (error) return { error: error.message }
    revalidatePath(`/events/${eventId}`)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removeRecipeFromEvent(eventRecipeId: string, eventId: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioId()
    await supabase.from('event_recipes').delete().eq('id', eventRecipeId)
    revalidatePath(`/events/${eventId}`)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateEventRecipe(id: string, input: { quantity?: number; override_retail_price?: number | null }): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioId()
    await supabase.from('event_recipes').update(input).eq('id', id)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Event Items ──────────────────────────────────────────────

export async function addEventItem(
  eventId: string,
  input: Omit<Database['public']['Tables']['event_items']['Insert'], 'event_id'>
): Promise<{ data?: EventItem; error?: string }> {
  try {
    const { supabase } = await getStudioId()
    const { data, error } = await supabase
      .from('event_items')
      .insert({ ...input, event_id: eventId } as Database['public']['Tables']['event_items']['Insert'])
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/events/${eventId}`)
    return { data: data as EventItem }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removeEventItem(eventItemId: string, eventId: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioId()
    await supabase.from('event_items').delete().eq('id', eventItemId)
    revalidatePath(`/events/${eventId}`)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateEventItemQuantity(eventItemId: string, quantity: number, eventId: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioId()
    await supabase.from('event_items').update({ quantity }).eq('id', eventItemId)
    revalidatePath(`/events/${eventId}`)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Event Quote Items ─────────────────────────────────────────

export async function addQuoteItem(
  eventId: string,
  input: Omit<Database['public']['Tables']['event_quote_items']['Insert'], 'event_id'>
): Promise<{ data?: EventQuoteItem; error?: string }> {
  try {
    const { supabase } = await getStudioId()
    const { data, error } = await supabase
      .from('event_quote_items')
      .insert({ ...input, event_id: eventId } as Database['public']['Tables']['event_quote_items']['Insert'])
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath(`/events/${eventId}`)
    return { data: data as EventQuoteItem }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateQuoteItem(
  id: string,
  eventId: string,
  input: Database['public']['Tables']['event_quote_items']['Update']
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioId()
    const { error } = await supabase.from('event_quote_items').update(input).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath(`/events/${eventId}`)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removeQuoteItem(id: string, eventId: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await getStudioId()
    await supabase.from('event_quote_items').delete().eq('id', id)
    revalidatePath(`/events/${eventId}`)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function createRecipeFromQuoteItem(
  quoteItemId: string,
  eventId: string,
  itemName: string,
  unitPrice: number,
  quantity: number
): Promise<{ data?: { id: string; name: string }; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()

    const { data: settings } = await supabase
      .from('studio_settings').select('*').eq('studio_id', studioId).single()

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        studio_id: studioId,
        name: itemName,
        status: 'draft',
        pricing_mode: 'work_back',
        target_retail_price: unitPrice,
        flower_markup: settings?.default_flower_markup,
        hardgoods_markup: settings?.default_hardgoods_markup,
        rental_markup: settings?.default_rental_markup,
        labor_mode: settings?.default_labor_mode,
        design_fee_pct: settings?.default_design_fee_pct,
        prep_rate: settings?.default_prep_rate,
        design_rate: settings?.default_design_rate,
      } as Database['public']['Tables']['recipes']['Insert'])
      .select('id, name')
      .single()

    if (recipeError || !recipe) return { error: recipeError?.message ?? 'Failed to create recipe' }

    await supabase.from('event_recipes').insert({ event_id: eventId, recipe_id: recipe.id, quantity })
    await supabase.from('event_quote_items').update({ recipe_id: recipe.id }).eq('id', quoteItemId)

    revalidatePath(`/events/${eventId}`)
    revalidatePath('/recipes')
    return { data: { id: recipe.id, name: recipe.name } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
