'use client'
import { useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Trash2, ChevronLeft, ShoppingCart, ExternalLink, Package, BookmarkPlus, Check, Search, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cycleEventStatus, addRecipeToEvent, removeRecipeFromEvent, updateEventRecipe, updateEvent, addEventItem, removeEventItem, updateEventItemQuantity } from '../actions'
import { EventQuoteSection } from './EventQuoteSection'
import type { QuoteItemWithRecipe } from './EventQuoteSection'
import { createRecipe } from '../../recipes/actions'
import { saveEventAsTemplate, useTemplateForEvent } from '@/app/(app)/templates/actions'
import { EVENT_TYPE_OPTIONS } from '@/lib/constants'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  quoteItems,
}: {
  event: EventFull
  allRecipes: Pick<Recipe, 'id' | 'name' | 'event_type' | 'status'>[]
  settings: StudioSettings | null
  role: string
  hardGoods: HardGood[]
  rentals: Rental[]
  quoteItems: QuoteItemWithRecipe[]
}) {
  const router = useRouter()
  const [event, setEvent] = useState(initialEvent)
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [newRecipeName, setNewRecipeName] = useState('')
  const [loading, setLoading] = useState(false)
  const [addRecipeOpen, setAddRecipeOpen] = useState(false)
  const [addRecipeSearch, setAddRecipeSearch] = useState('')
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

  const handleUseTemplate = async (templateId: string) => {
    setAddRecipeOpen(false)
    setAddRecipeSearch('')
    setLoading(true)
    const { error } = await useTemplateForEvent(templateId, event.id)
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

  const groupedTemplates = useMemo(() => {
    const q = addRecipeSearch.toLowerCase()
    const filtered = allRecipes.filter(r => !q || r.name.toLowerCase().includes(q))
    const groups = new Map<string, typeof allRecipes>()
    for (const r of filtered) {
      const key = r.event_type ?? 'other'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    }
    const result: { label: string; recipes: typeof allRecipes }[] = []
    for (const { value, label } of EVENT_TYPE_OPTIONS) {
      const group = groups.get(value)
      if (group?.length) result.push({ label, recipes: group })
    }
    return result
  }, [allRecipes, addRecipeSearch])

  // Save as Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState(event.name)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templateSavedId, setTemplateSavedId] = useState<string | null>(null)

  const handleSaveAsTemplate = async () => {
    const name = templateName.trim()
    if (!name) return
    setTemplateLoading(true)
    setTemplateError(null)
    const { data, error } = await saveEventAsTemplate(event.id, name)
    setTemplateLoading(false)
    if (error) { setTemplateError(error); return }
    setTemplateSavedId(data?.id ?? null)
  }

  const openTemplateDialog = () => {
    setTemplateName(event.name)
    setTemplateError(null)
    setTemplateSavedId(null)
    setTemplateDialogOpen(true)
  }

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
        <Button variant="outline" size="sm" onClick={openTemplateDialog}>
          <BookmarkPlus className="w-4 h-4 mr-1.5" /> Save as Template
        </Button>
        <Link href={`/orders?event=${event.id}`}>
          <Button variant="outline" size="sm">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Generate Order
          </Button>
        </Link>
      </div>

      {/* ─── Save as Template Dialog ────────────────────────────── */}
      <Dialog open={templateDialogOpen} onOpenChange={open => { if (!open) setTemplateDialogOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#2D5016]">Save as Event Template</DialogTitle>
          </DialogHeader>
          {templateSavedId ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#2D5016]/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-5 h-5 text-[#2D5016]" />
              </div>
              <p className="font-medium text-[#4A3F35] mb-1">Template saved!</p>
              <p className="text-sm text-[#A89880] mb-4">Your event template is ready to reuse.</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" onClick={() => setTemplateDialogOpen(false)} className="text-[#A89880]">Close</Button>
                <Button asChild className="bg-[#2D5016] hover:bg-[#2D5016]/90 text-white">
                  <Link href="/templates?tab=events" onClick={() => setTemplateDialogOpen(false)}>
                    View in Templates →
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              <p className="text-sm text-[#A89880]">
                Creates a reusable template with all recipes, items, and pricing settings from this event.
              </p>
              <div className="space-y-1.5">
                <Label>Template name</Label>
                <Input
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. Summer Wedding Package"
                />
              </div>
              {templateError && (
                <p className="text-sm text-red-600">{templateError}</p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)} disabled={templateLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAsTemplate}
                  disabled={templateLoading || !templateName.trim()}
                  className="bg-[#2D5016] hover:bg-[#2D5016]/90 text-white"
                >
                  {templateLoading ? 'Saving…' : 'Save as Template'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Event Summary — horizontal strip ─────────────────── */}
      {false && showPricing && summary && (
        <div className="bg-white rounded-xl border border-[#E8E0D8] mb-6 overflow-hidden">
          <div className="flex items-stretch divide-x divide-[#E8E0D8]">

            {/* COGS */}
            <div className="flex flex-col px-5 py-3 min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-[#A89880] uppercase tracking-widest mb-1">COGS</span>
              <span className="text-sm font-semibold font-mono text-[#4A3F35]">{formatCurrency(summary.totalCOGS)}</span>
              <span className="text-[11px] text-[#A89880] mt-0.5">{formatPct(summary.cogsAsPctOfRetail)} of retail</span>
            </div>

            {/* Labor */}
            <div className="flex flex-col px-5 py-3 min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-[#A89880] uppercase tracking-widest mb-1">Labor</span>
              <span className="text-sm font-semibold font-mono text-[#4A3F35]">{formatCurrency(summary.totalLabor)}</span>
              <span className="text-[11px] text-[#A89880] mt-0.5">{formatPct(summary.laborAsPctOfRetail)} of retail</span>
            </div>

            {/* Stems */}
            <div className="flex flex-col px-5 py-3 min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-[#A89880] uppercase tracking-widest mb-1">Stems</span>
              <span className="text-sm font-semibold text-[#4A3F35]">{summary.totalStems}</span>
            </div>

            {/* Services */}
            <div className="flex flex-col px-5 py-3 min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-[#A89880] uppercase tracking-widest mb-1">Services</span>
              <span className="text-sm font-semibold font-mono text-[#4A3F35]">{formatCurrency(summary.servicesTotal)}</span>
              <div className="flex gap-2 mt-1 flex-wrap">
                <ServiceFeeEdit label="Del" value={eventSettings.deliveryFee} feeType={eventSettings.deliveryFeeType} computedAmount={summary.deliveryFee} onChange={v => updateEventSettings({ deliveryFee: v })} onTypeChange={t => updateEventSettings({ deliveryFeeType: t })} compact />
                <ServiceFeeEdit label="Setup" value={eventSettings.setupFee} feeType={eventSettings.setupFeeType} computedAmount={summary.setupFee} onChange={v => updateEventSettings({ setupFee: v })} onTypeChange={t => updateEventSettings({ setupFeeType: t })} compact />
                <ServiceFeeEdit label="T/D" value={eventSettings.teardownFee} feeType={eventSettings.teardownFeeType} computedAmount={summary.teardownFee} onChange={v => updateEventSettings({ teardownFee: v })} onTypeChange={t => updateEventSettings({ teardownFeeType: t })} compact />
              </div>
            </div>

            {/* Tax */}
            <div className="flex flex-col px-5 py-3 min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-[#A89880] uppercase tracking-widest mb-1">Tax</span>
              <span className="text-sm font-semibold font-mono text-[#4A3F35]">{formatCurrency(summary.taxAmount)}</span>
              <EventInlineEdit label="Rate" value={eventSettings.taxRate} suffix="%" onChange={v => updateEventSettings({ taxRate: v })} compact />
            </div>

            {/* Total */}
            <div className="flex flex-col px-5 py-3 min-w-0 flex-1 bg-[#F5F1EC]">
              <span className="text-[10px] font-semibold text-[#A89880] uppercase tracking-widest mb-1">Total</span>
              <span className="text-base font-bold font-mono text-[#2D5016]">{formatCurrency(summary.totalRetailPrice)}</span>
              <span className="text-[11px] text-[#A89880] mt-0.5">{formatCurrency(summary.preTaxTotal)} pre-tax</span>
            </div>

            {/* Margin */}
            <div className="flex flex-col px-5 py-3 min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-[#A89880] uppercase tracking-widest mb-1">Margin</span>
              <MarginBadge marginPct={summary.blendedMarginPct} marginTarget={eventSettings.marginTarget} showValue />
              <EventInlineEdit label="Target" value={eventSettings.marginTarget} suffix="%" onChange={v => updateEventSettings({ marginTarget: v })} compact />
            </div>

          </div>
        </div>
      )}

      {/* ── Client Proposal (Quote) ─────────────────────────── */}
      <EventQuoteSection
        initialItems={quoteItems}
        eventId={event.id}
        canEdit={showPricing}
      />
    </div>
  )
}

function EventInlineEdit({
  label, value, suffix, onChange, compact,
}: {
  label: string
  value: number
  suffix: string
  onChange: (v: number) => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[10px] text-[#A89880]">{label}:</span>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-10 text-right text-[10px] font-mono text-[#4A3F35] bg-white border border-[#E8E0D8] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[#2D5016]"
        />
        <span className="text-[10px] text-[#A89880]">{suffix}</span>
      </div>
    )
  }
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
  label, value, feeType, computedAmount, onChange, onTypeChange, compact,
}: {
  label: string
  value: number
  feeType: FeeType
  computedAmount: number
  onChange: (v: number) => void
  onTypeChange: (t: FeeType) => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#A89880]">{label}:</span>
        <div className="flex rounded border border-[#E8E0D8] overflow-hidden text-[10px] shrink-0">
          <button type="button" onClick={() => onTypeChange('flat')} className={`px-1 py-0.5 font-medium transition-colors ${feeType === 'flat' ? 'bg-[#2D5016] text-white' : 'bg-white text-[#A89880]'}`}>$</button>
          <button type="button" onClick={() => onTypeChange('percentage')} className={`px-1 py-0.5 font-medium transition-colors ${feeType === 'percentage' ? 'bg-[#2D5016] text-white' : 'bg-white text-[#A89880]'}`}>%</button>
        </div>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-10 text-right text-[10px] font-mono text-[#4A3F35] bg-white border border-[#E8E0D8] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[#2D5016]"
        />
      </div>
    )
  }
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
