import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PaletteStrip } from '@/components/common/PaletteStrip'
import { ClickableRow } from '@/components/common/ClickableRow'
import { Plus, BookOpen, Calendar, Flower, ShoppingCart, ArrowRight } from 'lucide-react'

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
  ] = await Promise.all([
    admin.from('recipes').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).eq('status', 'active'),
    admin.from('events').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).gte('event_date', today.toISOString().split('T')[0]).lte('event_date', thirtyDaysOut.toISOString().split('T')[0]),
    admin.from('flowers').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).eq('is_active', true),
    admin.from('events').select('*').eq('studio_id', studioId).gte('event_date', today.toISOString().split('T')[0]).order('event_date').limit(5),
    admin.from('recipes').select('*, recipe_items(item_color_hex, item_color_name, item_type)').eq('studio_id', studioId).neq('status', 'archived').order('updated_at', { ascending: false }).limit(5),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-forest">Good morning</h1>
        <Link href="/recipes/new">
          <Button size="sm" className="cursor-pointer gap-1">
            <Plus className="w-3.5 h-3.5" /> New
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
            <Card className="cursor-pointer group h-full p-4 flex items-start justify-between">
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

      <div className="flex flex-col gap-12">
        {/* Upcoming events */}
        <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Upcoming Events</span>
          <Link href="/events" className="group flex items-center gap-1 text-xs text-subtle hover:text-body hover:bg-muted transition-colors px-2 py-1 rounded-md">View all <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>
        <Card className="overflow-hidden">
          {upcomingEvents?.length === 0 ? (
            <div className="py-8 text-center text-xs text-subtle">No events in the next 30 days</div>
          ) : (
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Client</th>
                  <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Date</th>
                  <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Venue</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents?.map(event => (
                  <ClickableRow key={event.id} href={`/events/${event.id}`} className="hover:bg-muted">
                    <td className="px-4 py-1 font-medium text-body truncate max-w-0">{event.client_name ?? '—'}</td>
                    <td className="px-4 py-1 text-subtle whitespace-nowrap">{event.event_date ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-1 text-subtle">{event.venue ?? '—'}</td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        </div>

        {/* Recent recipes */}
        <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Recent Recipes</span>
          <Link href="/recipes" className="group flex items-center gap-1 text-xs text-subtle hover:text-body hover:bg-muted transition-colors px-2 py-1 rounded-md">View all <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>
        <Card className="overflow-hidden">
          {recentRecipes?.length === 0 ? (
            <div className="py-8 text-center text-xs text-subtle">No recipes yet</div>
          ) : (
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Recipe</th>
                  <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Palette</th>
                </tr>
              </thead>
              <tbody>
                {recentRecipes?.map(recipe => {
                  const paletteColors = (recipe.recipe_items as Array<{ item_color_hex: string | null; item_color_name: string | null; item_type: string }>)
                    .filter(i => i.item_type === 'flower')
                    .map(i => ({ hex: i.item_color_hex, name: i.item_color_name }))
                  return (
                    <ClickableRow key={recipe.id} href={`/recipes/${recipe.id}`} className="hover:bg-muted">
                      <td className="px-4 py-1 font-medium text-body">{recipe.name}</td>
                      <td className="px-4 py-1"><PaletteStrip colors={paletteColors} maxColors={5} size="xs" /></td>
                    </ClickableRow>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
        </div>
      </div>
    </div>
  )
}
