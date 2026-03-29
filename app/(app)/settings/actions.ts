'use server'
import { getMemberOrThrow } from '@/lib/supabase/get-member'
import { revalidatePath } from 'next/cache'

async function getOwnerStudioId() {
  const { studioId, role, admin } = await getMemberOrThrow()
  if (role !== 'owner') throw new Error('Owner access required')
  return { supabase: admin, studioId }
}

export async function updateStudio(data: { name: string; currency_symbol: string; timezone: string }): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getOwnerStudioId()
    await supabase.from('studios').update(data).eq('id', studioId)
    revalidatePath('/settings')
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function updateStudioSettings(data: Record<string, number | string>): Promise<{ error?: string }> {
  try {
    const { studioId, role, admin } = await getMemberOrThrow()
    if (!['owner', 'designer'].includes(role)) throw new Error('Access denied')
    await admin.from('studio_settings').update(data).eq('studio_id', studioId)
    revalidatePath('/settings')
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function inviteMember(email: string, role: 'designer' | 'staff'): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getOwnerStudioId()
    const { error } = await supabase.from('studio_members').insert({
      studio_id: studioId, invited_email: email, role, status: 'pending',
    })
    if (error) return { error: error.message }
    revalidatePath('/settings')
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function revokeMember(memberId: string): Promise<{ error?: string }> {
  try {
    const { supabase, studioId } = await getOwnerStudioId()
    await supabase.from('studio_members').update({ status: 'revoked' }).eq('id', memberId).eq('studio_id', studioId)
    revalidatePath('/settings')
    return {}
  } catch (e) { return { error: (e as Error).message } }
}
