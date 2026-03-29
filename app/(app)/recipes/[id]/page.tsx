import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { RecipeBuilder } from './RecipeBuilder'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

async function getData(id: string, fromEventId?: string) {
  const { studioId, role } = await getMember()
  const admin = createAdminClient()

  const [
    { data: recipe },
    { data: settings },
    { data: flowers },
    { data: hardGoods },
    { data: rentals },
  ] = await Promise.all([
    admin
      .from('recipes')
      .select('*, recipe_items(*)')
      .eq('id', id)
      .eq('studio_id', studioId)
      .single(),
    admin
      .from('studio_settings')
      .select('*')
      .eq('studio_id', studioId)
      .single(),
    admin.from('flowers').select('*').eq('studio_id', studioId).eq('is_active', true).order('name'),
    admin.from('hard_goods').select('*').eq('studio_id', studioId).eq('is_active', true).order('name'),
    admin.from('rentals').select('*').eq('studio_id', studioId).eq('is_active', true).order('name'),
  ])

  if (!recipe) notFound()

  let fromEvent: { id: string; name: string } | null = null
  if (fromEventId) {
    const { data: event } = await admin
      .from('events')
      .select('id, name')
      .eq('id', fromEventId)
      .eq('studio_id', studioId)
      .single()
    if (event) fromEvent = { id: event.id, name: event.name }
  }

  return { recipe, settings, flowers: flowers ?? [], hardGoods: hardGoods ?? [], rentals: rentals ?? [], role, fromEvent }
}

export default async function RecipePage({ params, searchParams }: Props) {
  const { id } = await params
  const { from } = await searchParams
  const data = await getData(id, from)

  return <RecipeBuilder {...data} />
}
