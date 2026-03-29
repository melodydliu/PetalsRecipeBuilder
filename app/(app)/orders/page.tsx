import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrderGenerator } from './OrderGenerator'

export const metadata = { title: 'Orders — Petal' }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: eventId } = await searchParams
  const { studioId } = await getMember()
  const admin = createAdminClient()

  const [{ data: events }, { data: settings }] = await Promise.all([
    admin
      .from('events')
      .select('*, event_recipes(*, recipes(*, recipe_items(*)))')
      .eq('studio_id', studioId)
      .order('event_date', { ascending: true }),
    admin.from('studio_settings').select('default_waste_buffer_pct').eq('studio_id', studioId).single(),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Order Generator</h1>
        <p className="text-sm text-[#A89880] mt-1">Aggregate flower orders across events and recipes</p>
      </div>
      <OrderGenerator
        events={events ?? []}
        defaultWasteBuffer={settings?.default_waste_buffer_pct ?? 10}
        preselectedEventId={eventId}
      />
    </div>
  )
}
