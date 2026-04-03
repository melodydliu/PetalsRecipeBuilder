import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { EventDetail } from './EventDetail'

interface Props { params: Promise<{ id: string }> }

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params
  const { studioId, role } = await getMember()
  const admin = createAdminClient()

  const [{ data: event }, { data: settings }] = await Promise.all([
    admin
      .from('events')
      .select('*, event_recipes(*, recipes(*, recipe_items(*))), event_items(*)')
      .eq('id', id)
      .eq('studio_id', studioId)
      .single(),
    admin.from('studio_settings').select('*').eq('studio_id', studioId).single(),
  ])

  if (!event) notFound()

  return (
    <EventDetail
      event={event as Parameters<typeof EventDetail>[0]['event']}
      settings={settings}
      role={role}
    />
  )
}
