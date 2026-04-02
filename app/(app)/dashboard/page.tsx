import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarginBadge } from '@/components/common/MarginBadge'
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
    { data: settings },
    { data: studio },
  ] = await Promise.all([
    admin.from('recipes').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).eq('status', 'active'),
    admin.from('events').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).gte('event_date', today.toISOString().split('T')[0]).lte('event_date', thirtyDaysOut.toISOString().split('T')[0]),
    admin.from('flowers').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).eq('is_active', true),
    admin.from('events').select('*').eq('studio_id', studioId).gte('event_date', today.toISOString().split('T')[0]).order('event_date').limit(5),
    admin.from('recipes').select('*, recipe_items(item_color_hex, item_color_name, item_type)').eq('studio_id', studioId).neq('status', 'archived').order('updated_at', { ascending: false }).limit(5),
    admin.from('studio_settings').select('default_margin_target').eq('studio_id', studioId).single(),
    admin.from('studios').select('name').eq('id', studioId).single(),
  ])

  const studioName = studio?.name ?? 'My Studio'
  const marginTarget = settings?.default_margin_target ?? 70

  const EVENT_STATUS_LABELS: Record<string, string> = {
    to_do: 'To Do', in_progress: 'In Progress', ordered: 'Ordered', complete: 'Complete',
  }
  const EVENT_STATUS_VARIANTS: Record<string, string> = {
    to_do: 'draft', in_progress: 'blush', ordered: 'gold', complete: 'green',
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Good morning</h1>
          <p className="text-sm text-[#A89880] mt-1">{studioName}</p>
        </div>
        <Link href="/recipes/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> New
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Recipes', value: activeRecipes ?? 0, icon: BookOpen, href: '/recipes' },
          { label: 'Upcoming Events', value: upcomingEventsCount ?? 0, icon: Calendar, href: '/events', sub: 'next 30 days' },
          { label: 'Catalog Items', value: catalogItems ?? 0, icon: Flower, href: '/catalog' },
          { label: 'Quick Actions', value: null, icon: ShoppingCart, href: '/orders' },
        ].map(({ label, value, icon: Icon, href, sub }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#A89880] uppercase tracking-wide">{label}</p>
                    {value !== null ? (
                      <p className="font-serif text-3xl font-semibold text-[#2D5016] mt-1">{value}</p>
                    ) : (
                      <p className="text-sm text-[#4A3F35] mt-2">Generate orders →</p>
                    )}
                    {sub && <p className="text-xs text-[#A89880] mt-0.5">{sub}</p>}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2D5016]/8 flex items-center justify-center group-hover:bg-[#2D5016]/15 transition-colors">
                    <Icon className="w-5 h-5 text-[#2D5016]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {/* Upcoming events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingEvents?.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#A89880]">No events in the next 30 days</div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents?.map(event => (
                  <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between py-2 border-b border-[#E8E0D8] last:border-0 hover:text-[#2D5016] group">
                    <div>
                      <p className="text-sm font-medium text-[#4A3F35] group-hover:text-[#2D5016]">{event.name}</p>
                      <p className="text-xs text-[#A89880]">
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
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Recipes</CardTitle>
            <Link href="/recipes">
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recentRecipes?.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#A89880]">No recipes yet</div>
            ) : (
              <div className="space-y-3">
                {recentRecipes?.map(recipe => {
                  const paletteColors = (recipe.recipe_items as Array<{ item_color_hex: string | null; item_color_name: string | null; item_type: string }>)
                    .filter(i => i.item_type === 'flower')
                    .map(i => ({ hex: i.item_color_hex, name: i.item_color_name }))
                  return (
                    <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="flex items-center justify-between py-2 border-b border-[#E8E0D8] last:border-0 hover:text-[#2D5016] group">
                      <div className="flex items-center gap-3">
                        <PaletteStrip colors={paletteColors} maxColors={5} size="xs" />
                        <p className="text-sm font-medium text-[#4A3F35] group-hover:text-[#2D5016]">{recipe.name}</p>
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
