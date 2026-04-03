'use server'
import { getMemberOrThrow } from '@/lib/supabase/get-member'
import { revalidatePath } from 'next/cache'
import type { Event, EventStatus, EventItem, Database } from '@/types/database'

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

export async function duplicateEvent(id: string): Promise<{ data?: Event; error?: string }> {
  try {
    const { supabase, studioId } = await getStudioId()
    const { data: original } = await supabase.from('events').select('*').eq('id', id).eq('studio_id', studioId).single()
    if (!original) return { error: 'Event not found' }
    const { data, error } = await supabase
      .from('events')
      .insert({
        studio_id: studioId,
        name: original.client_name ?? '',
        client_name: original.client_name,
        event_date: original.event_date,
        venue: original.venue,
        event_type: original.event_type,
        recipe_status: 'to_do',
      } as Database['public']['Tables']['events']['Insert'])
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
