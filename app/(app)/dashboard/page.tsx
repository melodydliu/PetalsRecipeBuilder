import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PaletteStrip } from '@/components/common/PaletteStrip'
import { Plus, BookOpen, Calendar, Flower, ShoppingCart } from 'lucide-react'

export const metadata = { title: 'Dashboard — Petal' }

export default async function DashboardPage() {
  const { studioId } = await getMember()
  const admin = createAdminClient()
  const today = new Date()
  const thirtyDaysOut = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [
    { count: activeRecipes },
    { count: upcomingEventsCount },
    { count: catalogItems },
    { data: upcomingEvents },
    { data: recentRecipes },
    { data: studio },
  ] = await Promise.all([
    admin.from('recipes').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).eq('status', 'active'),
    admin.from('events').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).gte('event_date', today.toISOString().split('T')[0]).lte('event_date', thirtyDaysOut.toISOString().split('T')[0]),
    admin.from('flowers').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).eq('is_active', true),
    admin.from('events').select('*').eq('studio_id', studioId).gte('event_date', today.toISOString().split('T')[0]).order('event_date').limit(5),
    admin.from('recipes').select('*, recipe_items(item_color_hex, item_color_name, item_type)').eq('studio_id', studioId).neq('status', 'archived').order('updated_at', { ascending: false }).limit(5),
    admin.from('studios').select('name').eq('id', studioId).single(),
  ])

  const studioName = studio?.name ?? 'My Studio'

  const EVENT_STATUS_LABELS: Record<string, string> = {
    to_do: 'To Do', in_progress: 'In Progress', ordered: 'Ordered', complete: 'Complete',
  }
  const EVENT_STATUS_VARIANTS: Record<string, string> = {
    to_do: 'draft', in_progress: 'blush', ordered: 'gold', complete: 'green',
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-forest">Good morning</h1>
          <p className="text-xs text-subtle mt-0.5">{studioName}</p>
        </div>
        <Link href="/recipes/new">
          <Button size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Recipes', value: activeRecipes ?? 0, icon: BookOpen, href: '/recipes' },
          { label: 'Upcoming Events', value: upcomingEventsCount ?? 0, icon: Calendar, href: '/events', sub: 'next 30 days' },
          { label: 'Catalog Items', value: catalogItems ?? 0, icon: Flower, href: '/catalog' },
          { label: 'Orders', value: null, icon: ShoppingCart, href: '/orders' },
        ].map(({ label, value, icon: Icon, href, sub }) => (
          <Link key={href} href={href} className="h-full block">
            <Card className="hover:shadow-sm transition-shadow cursor-pointer group h-full p-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-subtle uppercase tracking-wide">{label}</p>
                {value !== null ? (
                  <p className="text-2xl font-semibold text-forest mt-1">{value}</p>
                ) : (
                  <p className="text-sm text-body mt-1">Generate →</p>
                )}
                {sub && <p className="text-[11px] text-subtle mt-0.5">{sub}</p>}
              </div>
              <div className="w-8 h-8 rounded-md bg-forest/8 flex items-center justify-center group-hover:bg-forest/15 transition-colors">
                <Icon className="w-4 h-4 text-forest" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {/* Upcoming events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm font-semibold">Upcoming Events</CardTitle>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {upcomingEvents?.length === 0 ? (
              <div className="py-6 text-center text-xs text-subtle">No events in the next 30 days</div>
            ) : (
              <div>
                {upcomingEvents?.map(event => (
                  <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 hover:text-forest group">
                    <div>
                      <p className="text-sm font-medium text-body group-hover:text-forest leading-snug">{event.name}</p>
                      <p className="text-[11px] text-subtle">
                        {event.client_name && `${event.client_name} · `}
                        {event.event_date && new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <Badge variant={(EVENT_STATUS_VARIANTS[event.recipe_status] ?? 'draft') as Parameters<typeof Badge>[0]['variant']}>
                      {EVENT_STATUS_LABELS[event.recipe_status]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent recipes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm font-semibold">Recent Recipes</CardTitle>
            <Link href="/recipes">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {recentRecipes?.length === 0 ? (
              <div className="py-6 text-center text-xs text-subtle">No recipes yet</div>
            ) : (
              <div>
                {recentRecipes?.map(recipe => {
                  const paletteColors = (recipe.recipe_items as Array<{ item_color_hex: string | null; item_color_name: string | null; item_type: string }>)
                    .filter(i => i.item_type === 'flower')
                    .map(i => ({ hex: i.item_color_hex, name: i.item_color_name }))
                  return (
                    <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 hover:text-forest group">
                      <div className="flex items-center gap-2.5">
                        <PaletteStrip colors={paletteColors} maxColors={5} size="xs" />
                        <p className="text-sm font-medium text-body group-hover:text-forest">{recipe.name}</p>
                      </div>
                      <Badge variant={recipe.status === 'active' ? 'active' : 'draft'} className="capitalize text-xs">
                        {recipe.status}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
