import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { EventList } from './EventList'

export const metadata = { title: 'Events — Petal' }

export default async function EventsPage() {
  const { studioId, role } = await getMember()
  const admin = createAdminClient()

  const [{ data: events }, { data: allStudioEvents }] = await Promise.all([
    admin
      .from('events')
      .select('*, event_recipes(recipe_id)')
      .eq('studio_id', studioId)
      .eq('is_template', false)
      .order('event_date', { ascending: true, nullsFirst: false }),
    admin
      .from('events')
      .select('id, name')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false }),
  ])

  // Filter in JS to avoid PostgREST schema cache issues with is_template column
  const eventTemplates = (allStudioEvents ?? []).filter(
    e => (e as { is_template?: boolean }).is_template === true
  ) as { id: string; name: string }[]

  return (
    <div>
      <EventList initialEvents={events ?? []} role={role} eventTemplates={eventTemplates} />
    </div>
  )
}
