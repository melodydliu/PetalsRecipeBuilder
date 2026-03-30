import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { EventDetail } from './EventDetail'

interface Props { params: Promise<{ id: string }> }

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params
  const { studioId, role } = await getMember()
  const admin = createAdminClient()

  const [{ data: event }, { data: allRecipes }, { data: settings }, { data: hardGoods }, { data: rentals }, { data: quoteItems }] = await Promise.all([
    admin
      .from('events')
      .select('*, event_recipes(*, recipes(*, recipe_items(*))), event_items(*)')
      .eq('id', id)
      .eq('studio_id', studioId)
      .single(),
    admin.from('recipes').select('id, name, event_type, status').eq('studio_id', studioId).eq('is_template', true).neq('status', 'archived').order('name'),
    admin.from('studio_settings').select('*').eq('studio_id', studioId).single(),
    admin.from('hard_goods').select('*').eq('studio_id', studioId).eq('is_active', true).order('name'),
    admin.from('rentals').select('*').eq('studio_id', studioId).eq('is_active', true).order('name'),
    admin.from('event_quote_items').select('*, recipes(id, name)').eq('event_id', id).order('sort_order'),
  ])

  if (!event) notFound()

  return (
    <EventDetail
      event={event as Parameters<typeof EventDetail>[0]['event']}
      allRecipes={allRecipes ?? []}
      settings={settings}
      role={role}
      hardGoods={hardGoods ?? []}
      rentals={rentals ?? []}
      quoteItems={(quoteItems ?? []) as Parameters<typeof EventDetail>[0]['quoteItems']}
    />
  )
}
