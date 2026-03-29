import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { EventList } from './EventList'

export const metadata = { title: 'Events — Petal' }

export default async function EventsPage() {
  const { studioId, role } = await getMember()
  const admin = createAdminClient()

  const { data: events } = await admin
    .from('events')
    .select('*, event_recipes(recipe_id)')
    .eq('studio_id', studioId)
    .order('event_date', { ascending: true, nullsFirst: false })

  return (
    <div>
      <EventList initialEvents={events ?? []} role={role} />
    </div>
  )
}
