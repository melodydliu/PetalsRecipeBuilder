import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Flower } from 'lucide-react'
import { ColorSwatch } from '@/components/common/ColorSwatch'
import { PaletteStrip } from '@/components/common/PaletteStrip'
import type { RecipeItem } from '@/types/database'

interface Props { params: Promise<{ token: string }> }

export default async function StaffSharePage({ params }: Props) {
  const { token } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) notFound()

  const supabase = await createClient()

  // Find recipe by share_token (no auth required via public RLS policy)
  const { data: recipe } = await supabase
    .from('recipes')
    .select(`
      id, name, event_type, notes, moodboard_url, share_token_active,
      recipe_items(id, item_type, item_name, item_variety, item_color_name, item_color_hex, item_unit, item_image_url, quantity, notes, sort_order),
      studios(name, logo_url)
    `)
    .eq('share_token', token)
    .single()

  if (!recipe || !recipe.share_token_active) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#2D5016] flex items-center justify-center mx-auto mb-6">
            <Flower className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[#4A3F35] mb-2">
            Recipe not available
          </h1>
          <p className="text-sm text-[#A89880]">This recipe link is no longer active.</p>
        </div>
      </div>
    )
  }

  // Strip ALL pricing data server-side — never send to client
  const safeItems: Array<{
    id: string; itemType: string; itemName: string; itemVariety: string | null
    itemColorName: string | null; itemColorHex: string | null
    itemUnit: string | null; itemImageUrl: string | null
    quantity: number; notes: string | null; sortOrder: number
  }> = (recipe.recipe_items as RecipeItem[])
    .filter(i => i.item_type === 'flower')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(i => ({
      id: i.id,
      itemType: i.item_type,
      itemName: i.item_name,
      itemVariety: i.item_variety,
      itemColorName: i.item_color_name,
      itemColorHex: i.item_color_hex,
      itemUnit: i.item_unit,
      itemImageUrl: i.item_image_url,
      quantity: Number(i.quantity),
      notes: i.notes,
      sortOrder: i.sort_order,
      // wholesale_cost_snapshot intentionally omitted
    }))

  const studio = recipe.studios as { name: string; logo_url: string | null } | null
  const paletteColors = safeItems.map(i => ({ hex: i.itemColorHex, name: i.itemColorName }))

  const EVENT_TYPE_LABELS: Record<string, string> = {
    bridal_bouquet: 'Bridal Bouquet', bridesmaid_bouquet: 'Bridesmaid Bouquet',
    toss_bouquet: 'Toss Bouquet', boutonniere: 'Boutonniere', corsage: 'Corsage',
    centerpiece_low: 'Low Centerpiece', centerpiece_tall: 'Tall Centerpiece',
    ceremony_arch: 'Ceremony Arch', altar_arrangement: 'Altar Arrangement',
    other: 'Other',
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Studio header */}
      <div className="bg-white border-b border-[#E8E0D8] px-6 py-4 no-print">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {studio?.logo_url ? (
            <img src={studio.logo_url} alt={studio.name} className="h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#2D5016] flex items-center justify-center">
              <Flower className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="font-medium text-[#4A3F35]">{studio?.name}</span>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block px-6 py-4 border-b border-gray-200 mb-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">{studio?.name}</span>
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Recipe header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            {recipe.event_type && (
              <span className="text-xs font-medium text-[#A89880] bg-[#F5F1EC] px-2.5 py-1 rounded-full uppercase tracking-wide">
                {EVENT_TYPE_LABELS[recipe.event_type] ?? recipe.event_type}
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#2D5016] mb-4">{recipe.name}</h1>
          <PaletteStrip colors={paletteColors} maxColors={10} size="md" />
        </div>

        {/* Flower list */}
        <div className="mb-8">
          <h2 className="font-serif text-lg font-semibold text-[#4A3F35] mb-4">
            Flowers ({safeItems.length})
          </h2>

          {safeItems.length === 0 ? (
            <p className="text-sm text-[#A89880]">No flowers listed in this recipe.</p>
          ) : (
            <div className="space-y-3">
              {safeItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-[#E8E0D8] px-5 py-4 flex items-center gap-4"
                >
                  {item.itemImageUrl ? (
                    <img
                      src={item.itemImageUrl}
                      alt={item.itemName}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <ColorSwatch hex={item.itemColorHex} size="md" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#4A3F35]">
                      {item.itemName}
                      {item.itemVariety && (
                        <span className="text-[#A89880] font-normal"> – {item.itemVariety}</span>
                      )}
                    </p>
                    {item.itemColorName && (
                      <p className="text-sm text-[#A89880]">{item.itemColorName}</p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-[#A89880] mt-1 italic">{item.notes}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-serif text-2xl font-semibold text-[#2D5016]">
                      {item.quantity}
                    </span>
                    <p className="text-xs text-[#A89880]">{item.itemUnit ?? 'stem'}s</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recipe notes */}
        {recipe.notes && (
          <div className="mb-6">
            <h2 className="font-serif text-lg font-semibold text-[#4A3F35] mb-3">Notes</h2>
            <div className="bg-white rounded-xl border border-[#E8E0D8] px-5 py-4">
              <p className="text-sm text-[#4A3F35] whitespace-pre-wrap">{recipe.notes}</p>
            </div>
          </div>
        )}

        {/* Moodboard link */}
        {recipe.moodboard_url && (
          <div className="mb-6">
            <a
              href={recipe.moodboard_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#2D5016] hover:underline"
            >
              View moodboard / inspiration board →
            </a>
          </div>
        )}

        {/* Print button */}
        <div className="mt-10 no-print">
          <button
            onClick={() => window.print()}
            className="text-sm text-[#A89880] hover:text-[#4A3F35] underline transition-colors"
          >
            Print this recipe
          </button>
        </div>
      </div>
    </div>
  )
}
