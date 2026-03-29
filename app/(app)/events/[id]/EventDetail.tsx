'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Trash2, ChevronLeft, ShoppingCart, ExternalLink, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cycleEventStatus, addRecipeToEvent, removeRecipeFromEvent, updateEventRecipe, updateEvent, addEventItem, removeEventItem, updateEventItemQuantity } from '../actions'
import { createRecipe } from '../../recipes/actions'
import { calculatePricingWaterfall, calculateEventSummary, formatCurrency, formatPct } from '@/lib/pricing/engine'
import type { EventPricingSettings, EventItemEntry } from '@/lib/pricing/engine'
import { MarginBadge } from '@/components/common/MarginBadge'
import type { Event, EventStatus, Recipe, RecipeItem, StudioSettings, EventItem, HardGood, Rental, EventItemType, FeeType } from '@/types/database'

type EventRecipeRow = {
  id: string; quantity: number; override_retail_price: number | null; sort_order: number
  recipes: Recipe & { recipe_items: RecipeItem[] }
}
type EventFull = Event & { event_recipes: EventRecipeRow[]; event_items: EventItem[] }

const STATUS_LABELS: Record<EventStatus, string> = {
  to_do: 'To Do', in_progress: 'In Progress', ordered: 'Ordered', complete: 'Complete',
}
const STATUS_VARIANTS: Record<EventStatus, Parameters<typeof Badge>[0]['variant']> = {
  to_do: 'draft', in_progress: 'blush', ordered: 'gold', complete: 'green',
}

const ITEM_TYPE_LABELS: Record<EventItemType, string> = {
  hard_good: 'Hard Good', rental: 'Rental', misc: 'Misc',
}

export function EventDetail({
  event: initialEvent,
  allRecipes,
  settings,
  role,
  hardGoods,
  rentals,
}: {
  event: EventFull
  allRecipes: Pick<Recipe, 'id' | 'name' | 'event_type' | 'status'>[]
  settings: StudioSettings | null
  role: string
  hardGoods: HardGood[]
  rentals: Rental[]
}) {
  const router = useRouter()
  const [event, setEvent] = useState(initialEvent)
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [newRecipeName, setNewRecipeName] = useState('')
  const [loading, setLoading] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Event items state
  const [items, setItems] = useState<EventItem[]>(initialEvent.event_items)
  const [addingItem, setAddingItem] = useState(false)
  const [addItemType, setAddItemType] = useState<EventItemType>('hard_good')
  const [addItemCatalogId, setAddItemCatalogId] = useState('')
  const [addItemMiscName, setAddItemMiscName] = useState('')
  const [addItemMiscCost, setAddItemMiscCost] = useState(0)
  const [addItemQty, setAddItemQty] = useState(1)
  const [addItemLoading, setAddItemLoading] = useState(false)

  const showPricing = role !== 'staff'

  // Event-level pricing settings (services, tax, margin target)
  const [eventSettings, setEventSettings] = useState<EventPricingSettings>({
    deliveryFee: initialEvent.delivery_fee ?? settings?.default_delivery_fee ?? 150,
    setupFee: initialEvent.setup_fee ?? settings?.default_setup_fee ?? 200,
    teardownFee: initialEvent.teardown_fee ?? settings?.default_teardown_fee ?? 100,
    deliveryFeeType: (initialEvent.delivery_fee_type ?? settings?.default_delivery_fee_type ?? 'flat') as FeeType,
    setupFeeType: (initialEvent.setup_fee_type ?? settings?.default_setup_fee_type ?? 'flat') as FeeType,
    teardownFeeType: (initialEvent.teardown_fee_type ?? settings?.default_teardown_fee_type ?? 'flat') as FeeType,
    taxRate: initialEvent.tax_rate ?? settings?.default_tax_rate ?? 0,
    marginTarget: initialEvent.margin_target ?? settings?.default_margin_target ?? 70,
  })

  const scheduleEventSettingsSave = useCallback((updates: Partial<EventPricingSettings>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const dbUpdates: Partial<Event> = {}
      if ('deliveryFee' in updates) dbUpdates.delivery_fee = updates.deliveryFee ?? null
      if ('setupFee' in updates) dbUpdates.setup_fee = updates.setupFee ?? null
      if ('teardownFee' in updates) dbUpdates.teardown_fee = updates.teardownFee ?? null
      if ('deliveryFeeType' in updates) dbUpdates.delivery_fee_type = updates.deliveryFeeType ?? null
      if ('setupFeeType' in updates) dbUpdates.setup_fee_type = updates.setupFeeType ?? null
      if ('teardownFeeType' in updates) dbUpdates.teardown_fee_type = updates.teardownFeeType ?? null
      if ('taxRate' in updates) dbUpdates.tax_rate = updates.taxRate ?? null
      if ('marginTarget' in updates) dbUpdates.margin_target = updates.marginTarget ?? null
      updateEvent(event.id, dbUpdates)
    }, 800)
  }, [event.id])

  const updateEventSettings = useCallback((updates: Partial<EventPricingSettings>) => {
    setEventSettings(s => ({ ...s, ...updates }))
    scheduleEventSettingsSave(updates)
  }, [scheduleEventSettingsSave])

  const handleCycleStatus = async () => {
    const cycle: EventStatus[] = ['to_do', 'in_progress', 'ordered', 'complete']
    const next = cycle[(cycle.indexOf(event.recipe_status) + 1) % cycle.length]
    setEvent(e => ({ ...e, recipe_status: next }))
    await cycleEventStatus(event.id, event.recipe_status)
  }

  const handleAddRecipe = async () => {
    if (!selectedRecipeId) return
    setLoading(true)
    const { error } = await addRecipeToEvent(event.id, selectedRecipeId)
    if (!error) {
      window.location.reload()
    }
    setLoading(false)
  }

  const handleCreateRecipe = async () => {
    const name = newRecipeName.trim()
    if (!name) return
    setLoading(true)
    const { data: recipe, error: createError } = await createRecipe({ name })
    if (createError || !recipe) { setLoading(false); return }
    const { error: addError } = await addRecipeToEvent(event.id, recipe.id)
    if (!addError) {
      router.push(`/recipes/${recipe.id}?from=${event.id}`)
    }
    setLoading(false)
  }

  const handleRemoveRecipe = async (erId: string) => {
    setEvent(e => ({ ...e, event_recipes: e.event_recipes.filter(r => r.id !== erId) }))
    await removeRecipeFromEvent(erId, event.id)
  }

  const handleQtyChange = async (erId: string, qty: number) => {
    setEvent(e => ({ ...e, event_recipes: e.event_recipes.map(r => r.id === erId ? { ...r, quantity: qty } : r) }))
    await updateEventRecipe(erId, { quantity: qty })
  }

  // Event item handlers
  const resetAddItemForm = () => {
    setAddItemType('hard_good')
    setAddItemCatalogId('')
    setAddItemMiscName('')
    setAddItemMiscCost(0)
    setAddItemQty(1)
    setAddingItem(false)
  }

  const handleAddItem = async () => {
    setAddItemLoading(true)

    let itemName = ''
    let wholesaleCostSnapshot = 0
    let hardGoodId: string | null = null
    let rentalId: string | null = null

    if (addItemType === 'hard_good') {
      const hg = hardGoods.find(h => h.id === addItemCatalogId)
      if (!hg) { setAddItemLoading(false); return }
      itemName = hg.name
      wholesaleCostSnapshot = hg.wholesale_cost
      hardGoodId = hg.id
    } else if (addItemType === 'rental') {
      const r = rentals.find(r => r.id === addItemCatalogId)
      if (!r) { setAddItemLoading(false); return }
      itemName = r.name
      wholesaleCostSnapshot = r.acquisition_cost / Math.max(1, r.times_used)
      rentalId = r.id
    } else {
      if (!addItemMiscName.trim()) { setAddItemLoading(false); return }
      itemName = addItemMiscName.trim()
      wholesaleCostSnapshot = addItemMiscCost
    }

    const { data, error } = await addEventItem(event.id, {
      item_type: addItemType,
      hard_good_id: hardGoodId,
      rental_id: rentalId,
      item_name: itemName,
      wholesale_cost_snapshot: wholesaleCostSnapshot,
      quantity: addItemQty,
      sort_order: items.length,
    })

    if (!error && data) {
      setItems(prev => [...prev, data])
      resetAddItemForm()
    }
    setAddItemLoading(false)
  }

  const handleRemoveItem = async (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await removeEventItem(itemId, event.id)
  }

  const handleItemQtyChange = async (itemId: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: qty } : i))
    await updateEventItemQuantity(itemId, qty, event.id)
  }

  // Build event item entries for pricing engine
  const eventItemEntries: EventItemEntry[] = items.map(item => ({
    itemType: item.item_type,
    wholesaleCostSnapshot: Number(item.wholesale_cost_snapshot),
    quantity: Number(item.quantity),
  }))

  // Event summary — services/tax/margin are event-level, not per-recipe
  const summaryEntries = event.event_recipes.map(er => {
    const recipe = er.recipes
    const ps = {
      flowerMarkup: recipe.flower_markup ?? settings?.default_flower_markup ?? 3.5,
      hardGoodsMarkup: recipe.hardgoods_markup ?? settings?.default_hardgoods_markup ?? 2.5,
      rentalMarkup: recipe.rental_markup ?? settings?.default_rental_markup ?? 2.5,
      laborMode: recipe.labor_mode ?? settings?.default_labor_mode ?? 'percentage',
      designFeePct: recipe.design_fee_pct ?? settings?.default_design_fee_pct ?? 30,
      prepHours: recipe.prep_hours ?? 0,
      prepRate: recipe.prep_rate ?? settings?.default_prep_rate ?? 35,
      designHours: recipe.design_hours ?? 0,
      designRate: recipe.design_rate ?? settings?.default_design_rate ?? 65,
      deliveryFee: 0,
      setupFee: 0,
      teardownFee: 0,
      deliveryFeeType: 'flat' as const,
      setupFeeType: 'flat' as const,
      teardownFeeType: 'flat' as const,
      taxRate: 0,
      marginTarget: eventSettings.marginTarget,
    }
    const items = recipe.recipe_items.map((i, idx) => ({
      id: i.id, itemType: i.item_type, itemName: i.item_name,
      itemVariety: i.item_variety, itemColorName: i.item_color_name,
      itemColorHex: i.item_color_hex, itemUnit: i.item_unit,
      itemImageUrl: i.item_image_url,
      wholesaleCostSnapshot: Number(i.wholesale_cost_snapshot),
      quantity: Number(i.quantity), notes: i.notes, sortOrder: idx,
    }))
    return { items, settings: ps, quantity: er.quantity, overrideRetailPrice: er.override_retail_price }
  })

  const summary = showPricing
    ? calculateEventSummary(
        summaryEntries,
        {
          ...eventSettings,
          hardGoodsMarkup: settings?.default_hardgoods_markup ?? 2.5,
          rentalMarkup: settings?.default_rental_markup ?? 2.5,
        },
        eventItemEntries
      )
    : null

  const addedRecipeIds = new Set(event.event_recipes.map(er => er.recipes.id))

  // Determine if the add-item form is ready to submit
  const canAddItem =
    addItemType === 'misc'
      ? !!addItemMiscName.trim()
      : !!addItemCatalogId

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/events" className="text-[#A89880] hover:text-[#4A3F35] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-semibold text-[#4A3F35]">{event.name}</h1>
            <button onClick={handleCycleStatus}>
              <Badge variant={STATUS_VARIANTS[event.recipe_status]} className="cursor-pointer hover:opacity-80">
                {STATUS_LABELS[event.recipe_status]}
              </Badge>
            </button>
          </div>
          <p className="text-sm text-[#A89880] mt-0.5">
            {event.client_name && `${event.client_name} · `}
            {event.event_date && new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {event.venue && ` · ${event.venue}`}
          </p>
        </div>
        <Link href={`/orders?event=${event.id}`}>
          <Button variant="outline" size="sm">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Generate Order
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column: recipes + event items */}
        <div className="col-span-2 space-y-3">
          {/* ── Recipes ── */}
          {event.event_recipes.map(er => {
            const recipe = er.recipes
            const wf = showPricing ? calculatePricingWaterfall(
              recipe.recipe_items.map((i, idx) => ({
                id: i.id, itemType: i.item_type, itemName: i.item_name,
                itemVariety: i.item_variety, itemColorName: i.item_color_name,
                itemColorHex: i.item_color_hex, itemUnit: i.item_unit,
                itemImageUrl: i.item_image_url,
                wholesaleCostSnapshot: Number(i.wholesale_cost_snapshot),
                quantity: Number(i.quantity), notes: i.notes, sortOrder: idx,
              })),
              {
                flowerMarkup: recipe.flower_markup ?? settings?.default_flower_markup ?? 3.5,
                hardGoodsMarkup: recipe.hardgoods_markup ?? settings?.default_hardgoods_markup ?? 2.5,
                rentalMarkup: recipe.rental_markup ?? settings?.default_rental_markup ?? 2.5,
                laborMode: recipe.labor_mode ?? settings?.default_labor_mode ?? 'percentage',
                designFeePct: recipe.design_fee_pct ?? settings?.default_design_fee_pct ?? 30,
                prepHours: recipe.prep_hours ?? 0, prepRate: recipe.prep_rate ?? settings?.default_prep_rate ?? 35,
                designHours: recipe.design_hours ?? 0, designRate: recipe.design_rate ?? settings?.default_design_rate ?? 65,
                deliveryFee: 0, setupFee: 0, teardownFee: 0,
                deliveryFeeType: 'flat' as const, setupFeeType: 'flat' as const, teardownFeeType: 'flat' as const,
                taxRate: 0,
                marginTarget: eventSettings.marginTarget,
              }
            ) : null

            return (
              <div key={er.id} className="bg-white rounded-xl border border-[#E8E0D8] px-5 py-4 flex items-center gap-4 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/recipes/${recipe.id}?from=${event.id}`} className="font-medium text-[#4A3F35] hover:text-[#2D5016] flex items-center gap-1">
                      {recipe.name}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    {showPricing && wf && (
                      <MarginBadge marginPct={wf.grossMarginPct} marginTarget={eventSettings.marginTarget} size="sm" />
                    )}
                  </div>
                  {showPricing && wf && (
                    <p className="text-sm text-[#A89880] mt-0.5">
                      {formatCurrency(wf.recipeSubtotal)} each · {formatCurrency(wf.recipeSubtotal * er.quantity)} total
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-1">
                  <button onClick={() => handleQtyChange(er.id, Math.max(1, er.quantity - 1))}
                    className="w-7 h-7 rounded-md bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center">–</button>
                  <span className="w-8 text-center text-sm font-medium">{er.quantity}×</span>
                  <button onClick={() => handleQtyChange(er.id, er.quantity + 1)}
                    className="w-7 h-7 rounded-md bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center">+</button>
                </div>

                <Button size="icon-sm" variant="ghost" onClick={() => handleRemoveRecipe(er.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-[#C0392B]" />
                </Button>
              </div>
            )
          })}

          {event.event_recipes.length === 0 && (
            <div className="bg-white rounded-xl border border-[#E8E0D8] py-12 text-center">
              <p className="text-sm text-[#A89880]">No recipes added yet. Search your recipe library below.</p>
            </div>
          )}

          {/* Add recipe */}
          <div className="flex items-center gap-3 mt-4">
            {selectedRecipeId === '__new__' ? (
              <>
                <input
                  autoFocus
                  type="text"
                  value={newRecipeName}
                  onChange={e => setNewRecipeName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateRecipe()
                    if (e.key === 'Escape') { setSelectedRecipeId(''); setNewRecipeName('') }
                  }}
                  placeholder="Recipe name…"
                  className="flex-1 h-9 rounded-md border border-[#E8E0D8] bg-white px-3 text-sm text-[#4A3F35] placeholder:text-[#A89880] outline-none focus:ring-1 focus:ring-[#2D5016]"
                />
                <Button onClick={handleCreateRecipe} disabled={!newRecipeName.trim() || loading} size="sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Create & Open
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedRecipeId(''); setNewRecipeName('') }}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add a recipe…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__" className="text-[#2D5016] font-medium">
                      + New recipe…
                    </SelectItem>
                    {allRecipes.filter(r => !addedRecipeIds.has(r.id)).map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddRecipe} disabled={!selectedRecipeId || loading} size="sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Recipe
                </Button>
              </>
            )}
          </div>

          {/* ── Event Items ── */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#A89880]" />
                <h2 className="text-sm font-semibold text-[#4A3F35]">Event Items</h2>
                <span className="text-xs text-[#A89880]">Hard goods, rentals &amp; misc not tied to a recipe</span>
              </div>
              {!addingItem && (
                <Button size="sm" variant="outline" onClick={() => setAddingItem(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              )}
            </div>

            {/* Existing event items */}
            {items.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {items.map(item => (
                  <div key={item.id} className="bg-white rounded-lg border border-[#E8E0D8] px-4 py-2.5 flex items-center gap-3 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#4A3F35] truncate">{item.item_name}</span>
                        <span className="text-xs text-[#A89880] shrink-0">{ITEM_TYPE_LABELS[item.item_type]}</span>
                      </div>
                      {showPricing && (
                        <p className="text-xs text-[#A89880] mt-0.5 font-mono">
                          {formatCurrency(Number(item.wholesale_cost_snapshot))} each
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleItemQtyChange(item.id, Math.max(1, Number(item.quantity) - 1))}
                        className="w-6 h-6 rounded bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center text-xs">–</button>
                      <span className="w-7 text-center text-sm font-medium">{Number(item.quantity)}×</span>
                      <button
                        onClick={() => handleItemQtyChange(item.id, Number(item.quantity) + 1)}
                        className="w-6 h-6 rounded bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center text-xs">+</button>
                    </div>
                    <Button size="icon-sm" variant="ghost" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-[#C0392B]" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 && !addingItem && (
              <p className="text-xs text-[#A89880] py-2">No event-level items yet.</p>
            )}

            {/* Add item form */}
            {addingItem && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-[#E8E0D8] p-4 space-y-3"
              >
                {/* Type selector */}
                <div className="flex gap-2">
                  {(['hard_good', 'rental', 'misc'] as EventItemType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setAddItemType(t); setAddItemCatalogId('') }}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        addItemType === t
                          ? 'bg-[#2D5016] text-white'
                          : 'bg-[#F5F1EC] text-[#4A3F35] hover:bg-[#E8E0D8]'
                      }`}
                    >
                      {ITEM_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>

                <div className="flex items-end gap-3">
                  {/* Catalog picker or misc name+cost */}
                  {addItemType === 'hard_good' && (
                    <div className="flex-1">
                      <Select value={addItemCatalogId} onValueChange={setAddItemCatalogId}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select hard good…" />
                        </SelectTrigger>
                        <SelectContent>
                          {hardGoods.map(hg => (
                            <SelectItem key={hg.id} value={hg.id}>
                              {hg.name}
                              {showPricing && <span className="text-[#A89880] ml-1">· {formatCurrency(hg.wholesale_cost)}</span>}
                            </SelectItem>
                          ))}
                          {hardGoods.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-[#A89880]">No hard goods in catalog</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {addItemType === 'rental' && (
                    <div className="flex-1">
                      <Select value={addItemCatalogId} onValueChange={setAddItemCatalogId}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select rental…" />
                        </SelectTrigger>
                        <SelectContent>
                          {rentals.map(r => {
                            const costPerUse = r.acquisition_cost / Math.max(1, r.times_used)
                            return (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                                {showPricing && <span className="text-[#A89880] ml-1">· {formatCurrency(costPerUse)}/use</span>}
                              </SelectItem>
                            )
                          })}
                          {rentals.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-[#A89880]">No rentals in catalog</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {addItemType === 'misc' && (
                    <>
                      <div className="flex-1">
                        <input
                          autoFocus
                          type="text"
                          value={addItemMiscName}
                          onChange={e => setAddItemMiscName(e.target.value)}
                          placeholder="Item name…"
                          className="w-full h-9 rounded-md border border-[#E8E0D8] bg-white px-3 text-sm text-[#4A3F35] placeholder:text-[#A89880] outline-none focus:ring-1 focus:ring-[#2D5016]"
                        />
                      </div>
                      <div className="w-28">
                        <div className="flex items-center border border-[#E8E0D8] rounded-md overflow-hidden bg-white h-9">
                          <span className="px-2 text-xs text-[#A89880]">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={addItemMiscCost}
                            onChange={e => setAddItemMiscCost(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-2 min-w-0"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Quantity */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setAddItemQty(q => Math.max(1, q - 1))}
                      className="w-7 h-9 rounded-md bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center">–</button>
                    <span className="w-7 text-center text-sm font-medium">{addItemQty}</span>
                    <button
                      onClick={() => setAddItemQty(q => q + 1)}
                      className="w-7 h-9 rounded-md bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center">+</button>
                  </div>

                  <Button size="sm" onClick={handleAddItem} disabled={!canAddItem || addItemLoading}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={resetAddItemForm}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Event summary panel */}
        {showPricing && summary && (
          <div>
            <Card>
              <CardHeader><CardTitle className="text-base">Event Summary</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {/* Recipe totals */}
                <div className="flex justify-between py-0.5">
                  <span className="text-[#A89880]">Total COGS</span>
                  <span className="font-mono">{formatCurrency(summary.totalCOGS)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#A89880]">Total Labor</span>
                  <span className="font-mono">{formatCurrency(summary.totalLabor)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#A89880]">Total Stems</span>
                  <span>{summary.totalStems}</span>
                </div>
                <div className="flex justify-between py-0.5 font-semibold">
                  <span>Recipes Subtotal</span>
                  <span className="font-mono">{formatCurrency(summary.recipesSubtotal)}</span>
                </div>

                {/* Event items subtotal */}
                {summary.eventItemsSubtotal > 0 && (
                  <div className="flex justify-between py-0.5 font-semibold">
                    <span>Event Items</span>
                    <span className="font-mono">{formatCurrency(summary.eventItemsSubtotal)}</span>
                  </div>
                )}

                <Separator className="my-2" />

                {/* Services */}
                <p className="text-xs font-semibold text-[#A89880] uppercase tracking-wide pt-1">Services</p>
                <ServiceFeeEdit
                  label="Delivery"
                  value={eventSettings.deliveryFee}
                  feeType={eventSettings.deliveryFeeType}
                  computedAmount={summary.deliveryFee}
                  onChange={v => updateEventSettings({ deliveryFee: v })}
                  onTypeChange={t => updateEventSettings({ deliveryFeeType: t })}
                />
                <ServiceFeeEdit
                  label="Setup"
                  value={eventSettings.setupFee}
                  feeType={eventSettings.setupFeeType}
                  computedAmount={summary.setupFee}
                  onChange={v => updateEventSettings({ setupFee: v })}
                  onTypeChange={t => updateEventSettings({ setupFeeType: t })}
                />
                <ServiceFeeEdit
                  label="Teardown"
                  value={eventSettings.teardownFee}
                  feeType={eventSettings.teardownFeeType}
                  computedAmount={summary.teardownFee}
                  onChange={v => updateEventSettings({ teardownFee: v })}
                  onTypeChange={t => updateEventSettings({ teardownFeeType: t })}
                />
                <div className="flex justify-between py-0.5 font-semibold">
                  <span>Services Total</span>
                  <span className="font-mono">{formatCurrency(summary.servicesTotal)}</span>
                </div>

                <Separator className="my-2" />

                {/* Final */}
                <p className="text-xs font-semibold text-[#A89880] uppercase tracking-wide pt-1">Final</p>
                <div className="flex justify-between py-0.5">
                  <span className="text-[#A89880]">Pre-tax Total</span>
                  <span className="font-mono">{formatCurrency(summary.preTaxTotal)}</span>
                </div>
                <EventInlineEdit
                  label="Tax rate"
                  value={eventSettings.taxRate}
                  suffix="%"
                  onChange={v => updateEventSettings({ taxRate: v })}
                />
                <div className="flex justify-between py-0.5 text-[#A89880]">
                  <span>Tax</span>
                  <span className="font-mono">{formatCurrency(summary.taxAmount)}</span>
                </div>
                <div className="flex justify-between py-1 font-semibold border-t-2 border-[#E8E0D8] mt-1">
                  <span>TOTAL RETAIL PRICE</span>
                  <span className="font-mono">{formatCurrency(summary.totalRetailPrice)}</span>
                </div>

                <Separator className="my-2" />

                {/* Profit Analysis */}
                <p className="text-xs font-semibold text-[#A89880] uppercase tracking-wide pt-1">Profit Analysis</p>
                <div className="flex justify-between py-0.5 text-[#A89880]">
                  <span>COGS % of retail</span>
                  <span className="font-mono">{formatPct(summary.cogsAsPctOfRetail)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-[#A89880]">
                  <span>Labor % of retail</span>
                  <span className="font-mono">{formatPct(summary.laborAsPctOfRetail)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Gross Profit</span>
                  <span className="font-mono">{formatCurrency(summary.grossProfit)}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="font-semibold">Gross Margin</span>
                  <MarginBadge marginPct={summary.blendedMarginPct} marginTarget={eventSettings.marginTarget} showValue />
                </div>
                <EventInlineEdit
                  label="Target margin"
                  value={eventSettings.marginTarget}
                  suffix="%"
                  onChange={v => updateEventSettings({ marginTarget: v })}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function EventInlineEdit({
  label, value, suffix, onChange,
}: {
  label: string
  value: number
  suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[#A89880]">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-16 text-right text-xs font-mono text-[#4A3F35] bg-white border border-[#E8E0D8] rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-[#2D5016]"
        />
        <span className="text-xs text-[#A89880]">{suffix}</span>
      </div>
    </div>
  )
}

function ServiceFeeEdit({
  label, value, feeType, computedAmount, onChange, onTypeChange,
}: {
  label: string
  value: number
  feeType: FeeType
  computedAmount: number
  onChange: (v: number) => void
  onTypeChange: (t: FeeType) => void
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[#A89880]">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex rounded border border-[#E8E0D8] overflow-hidden text-[10px] shrink-0">
          <button
            type="button"
            onClick={() => onTypeChange('flat')}
            className={`px-1.5 py-0.5 font-medium transition-colors ${feeType === 'flat' ? 'bg-[#2D5016] text-white' : 'bg-white text-[#A89880]'}`}
          >$</button>
          <button
            type="button"
            onClick={() => onTypeChange('percentage')}
            className={`px-1.5 py-0.5 font-medium transition-colors ${feeType === 'percentage' ? 'bg-[#2D5016] text-white' : 'bg-white text-[#A89880]'}`}
          >%</button>
        </div>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-14 text-right text-xs font-mono text-[#4A3F35] bg-white border border-[#E8E0D8] rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-[#2D5016]"
        />
        <span className="text-xs text-[#A89880] w-3.5">{feeType === 'flat' ? '$' : '%'}</span>
        {feeType === 'percentage' && (
          <span className="text-xs text-[#A89880] font-mono whitespace-nowrap">≈{formatCurrency(computedAmount)}</span>
        )}
      </div>
    </div>
  )
}
