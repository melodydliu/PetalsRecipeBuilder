import { createClient } from './server'
import { createAdminClient } from './admin'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/database'

/**
 * Gets the authenticated user + their studio membership using the admin client
 * to bypass Supabase's role permission issues on self-hosted/new projects.
 */
export async function getMember(): Promise<{ userId: string; studioId: string; role: UserRole }> {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return {
      userId: 'dev-user',
      studioId: process.env.DEV_STUDIO_ID ?? 'dev-studio',
      role: 'owner' as UserRole,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member) redirect('/auth/onboarding')
  return { userId: user.id, studioId: member.studio_id, role: member.role }
}

/**
 * Same as getMember but throws instead of redirecting (for use in Server Actions).
 */
export async function getMemberOrThrow(): Promise<{ userId: string; studioId: string; role: UserRole; admin: ReturnType<typeof createAdminClient> }> {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return {
      userId: 'dev-user',
      studioId: process.env.DEV_STUDIO_ID ?? 'dev-studio',
      role: 'owner' as UserRole,
      admin: createAdminClient(),
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member) throw new Error('Not a studio member')
  return { userId: user.id, studioId: member.studio_id, role: member.role, admin }
}
