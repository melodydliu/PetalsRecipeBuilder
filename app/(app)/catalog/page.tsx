import { Suspense } from 'react'
import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { CatalogTabs } from './CatalogTabs'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = { title: 'Catalog — Petal' }

export default async function CatalogPage() {
  const { studioId } = await getMember()
  const admin = createAdminClient()

  const [
    { data: flowers },
    { data: hardGoods },
    { data: rentals },
  ] = await Promise.all([
    admin.from('flowers').select('*').eq('studio_id', studioId).eq('is_active', true).order('name'),
    admin.from('hard_goods').select('*').eq('studio_id', studioId).eq('is_active', true).order('name'),
    admin.from('rentals').select('*').eq('studio_id', studioId).eq('is_active', true).order('name'),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Catalog</h1>
        <p className="text-sm text-[#A89880] mt-1">Manage your flowers, hard goods, and rental items</p>
      </div>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogTabs
          initialFlowers={flowers ?? []}
          initialHardGoods={hardGoods ?? []}
          initialRentals={rentals ?? []}
        />
      </Suspense>
    </div>
  )
}

function CatalogSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
    </div>
  )
}
