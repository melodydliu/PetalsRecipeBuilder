'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createStudio({
  name,
  currencySymbol,
}: {
  name: string
  currencySymbol: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Create studio, settings, and owner member in one SECURITY DEFINER function
  const { error: studioError } = await supabase.rpc('create_studio', {
    p_name: name,
    p_currency_symbol: currencySymbol,
    p_user_id: user.id,
    p_user_email: user.email ?? '',
  })

  if (studioError) {
    return { error: studioError.message }
  }

  revalidatePath('/')
  return {}
}

export async function joinStudio({
  inviteCode,
}: {
  inviteCode: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Find studio by invite code
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()

  if (!studio) return { error: 'Invalid invite code. Check with your studio owner.' }
  if (!user.email) return { error: 'No email associated with this account.' }

  // Find pending invite for this email
  const { data: invite } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studio.id)
    .eq('invited_email', user.email)
    .eq('status', 'pending')
    .single()

  if (!invite) {
    return { error: 'No pending invite found for this email at that studio.' }
  }

  // Activate the invite
  await supabase
    .from('studio_members')
    .update({
      user_id: user.id,
      status: 'active',
      last_active_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  revalidatePath('/')
  return {}
}
