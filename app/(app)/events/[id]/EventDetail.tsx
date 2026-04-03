'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trash2, CalendarDays, ShoppingCart, BookmarkPlus, Check, Flower as FlowerIcon, Flower2, Leaf, Sprout, Sparkles, Heart, Droplets, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { addRecipeToEvent, removeRecipeFromEvent, updateEventRecipe, updateEvent } from '../actions'
import { saveEventAsTemplate } from '@/app/(app)/templates/actions'
import { createRecipe } from '../../recipes/actions'
import { calculatePricingWaterfall, calculateEventSummary, formatCurrency, formatPct } from '@/lib/pricing/engine'
import type { EventPricingSettings } from '@/lib/pricing/engine'
import { MarginBadge } from '@/components/common/MarginBadge'
import type { Event, Recipe, RecipeItem, StudioSettings, EventItem, FeeType } from '@/types/database'

type EventRecipeRow = {
  id: string; quantity: number; override_retail_price: number | null; sort_order: number
  recipes: Recipe & { recipe_items: RecipeItem[] }
}
type EventFull = Event & { event_recipes: EventRecipeRow[]; event_items: EventItem[] }

export function EventDetail({
  event: initialEvent,
  settings,
  role,
}: {
  event: EventFull
  settings: StudioSettings | null
  role: string
}) {
  const router = useRouter()
  const [event, setEvent] = useState(initialEvent)
  useEffect(() => { setEvent(initialEvent) }, [initialEvent])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Event confirmed state — resets when no recipes remain
  const [eventConfirmed, setEventConfirmed] = useState(false)
  useEffect(() => {
    if (event.event_recipes.length === 0) setEventConfirmed(false)
  }, [event.event_recipes.length])

  // Delete confirmation
  const [confirmDeleteErid, setConfirmDeleteErid] = useState<string | null>(null)

  // Build quote modal
  const [addRecipeOpen, setAddRecipeOpen] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [itemPrice, setItemPrice] = useState<number | ''>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const itemTotal = itemQty * (typeof itemPrice === 'number' ? itemPrice : 0)

  const handleOpenBuildQuote = () => {
    setItemName('')
    setItemQty(1)
    setItemPrice('')
    setCreateError(null)
    setAddRecipeOpen(true)
  }

  const handleCreateQuoteItem = async () => {
    const name = itemName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(null)
    const { data: recipe, error: recipeError } = await createRecipe({ name })
    if (recipeError || !recipe) { setCreating(false); setCreateError(recipeError ?? 'Failed to create item'); return }
    const price = typeof itemPrice === 'number' ? itemPrice : null
    await addRecipeToEvent(event.id, recipe.id, itemQty, price)
    setAddRecipeOpen(false)
    router.refresh()
  }

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

  const handleRemoveRecipe = async (erId: string) => {
    setEvent(e => ({ ...e, event_recipes: e.event_recipes.filter(r => r.id !== erId) }))
    await removeRecipeFromEvent(erId, event.id)
  }

  const handleQtyChange = async (erId: string, qty: number) => {
    setEvent(e => ({ ...e, event_recipes: e.event_recipes.map(r => r.id === erId ? { ...r, quantity: qty } : r) }))
    await updateEventRecipe(erId, { quantity: qty })
  }

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
        []
      )
    : null

  // Save as Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState(event.client_name ?? '')
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
    setTemplateName(event.client_name ?? '')
    setTemplateError(null)
    setTemplateSavedId(null)
    setTemplateDialogOpen(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/events" className="text-subtle hover:text-body transition-colors">Events</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-body">{event.client_name || '—'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {event.event_date && (
            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-subtle">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1"
            onClick={() => setEventConfirmed(c => !c)}
          >
            {eventConfirmed ? 'Mark as Not Confirmed' : 'Mark as Confirmed'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer w-8 px-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild className="cursor-pointer gap-2">
                <Link href={`/orders?event=${event.id}`}>
                  <ShoppingCart className="w-3.5 h-3.5" /> Generate Order
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={openTemplateDialog}>
                <BookmarkPlus className="w-3.5 h-3.5" /> Save as Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Delete Item Confirmation ───────────────────────────── */}
      <Dialog open={!!confirmDeleteErid} onOpenChange={v => { if (!v) setConfirmDeleteErid(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove item?</DialogTitle></DialogHeader>
          <p className="text-sm text-subtle">This will remove the item from your quote and cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteErid(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { handleRemoveRecipe(confirmDeleteErid!); setConfirmDeleteErid(null) }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Build Quote Modal ──────────────────────────────────── */}
      <Dialog open={addRecipeOpen} onOpenChange={open => { if (!open) setAddRecipeOpen(false) }}>
        <DialogContent className="sm:max-w-[440px] p-0">
          {/* Header band */}
          <div className="bg-forest/5 px-6 pt-6 pb-5 rounded-t-xl">
            <div className="flex items-center gap-2.5 mb-0.5">
              <Flower2 className="w-4 h-4 text-forest" />
              <DialogTitle className="text-base font-semibold text-body">Build Quote</DialogTitle>
            </div>
            <p className="text-sm text-subtle pl-[26px]">Add an item, set the quantity and price to build your event quote.</p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Item name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-body uppercase tracking-wide">Item</Label>
              <Input
                autoFocus
                placeholder="e.g. Bridal Bouquet"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Quantity + Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-body uppercase tracking-wide">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={itemQty}
                  onChange={e => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-body uppercase tracking-wide">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle text-sm pointer-events-none">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={itemPrice}
                    onChange={e => setItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="h-9 pl-6"
                  />
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted border border-border">
              <span className="text-xs font-semibold text-body uppercase tracking-wide">Total</span>
              <span className="text-sm font-semibold text-body font-mono">{formatCurrency(itemTotal)}</span>
            </div>

            {createError && (
              <p className="text-sm text-danger bg-red-50 rounded-md px-3 py-2">{createError}</p>
            )}
          </div>

          <div className="px-6 pb-5 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setAddRecipeOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="cursor-pointer gap-1 bg-forest text-cream hover:bg-forest/90"
              onClick={handleCreateQuoteItem}
              disabled={!itemName.trim() || creating}
            >
              <Flower2 className="w-3.5 h-3.5" />
              {creating ? 'Creating…' : 'Add to Quote'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      <div className="grid grid-cols-3 gap-6">
        {/* Left column: recipes + event items */}
        <div className="col-span-2 space-y-3">
          {/* ── Recipes ── */}
          {event.event_recipes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              {/* Floral constellation */}
              <div className="relative w-52 h-52 mb-8">
                {/* Rings */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-blush/50" />
                <div className="absolute inset-9 rounded-full border border-dashed border-forest/20" />
                {/* Center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-forest flex items-center justify-center">
                    <Flower2 className="w-8 h-8 text-cream" />
                  </div>
                </div>
                {/* Top — Sparkles (gold) */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-gold/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gold" />
                </div>
                {/* Right — Leaf (forest) */}
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-9 h-9 rounded-full bg-white border border-forest/30 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-forest" />
                </div>
                {/* Bottom — Sprout (forest) */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-forest/30 flex items-center justify-center">
                  <Sprout className="w-4 h-4 text-forest" />
                </div>
                {/* Left — Flower (blush) */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-9 h-9 rounded-full bg-white border border-blush/40 flex items-center justify-center">
                  <FlowerIcon className="w-4 h-4 text-blush" />
                </div>
                {/* Top-right — Heart (blush) */}
                <div className="absolute top-5 right-4 w-8 h-8 rounded-full bg-white border border-blush/40 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-blush" />
                </div>
                {/* Bottom-left — Droplets (gold) */}
                <div className="absolute bottom-5 left-4 w-8 h-8 rounded-full bg-white border border-gold/40 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5 text-gold" />
                </div>
              </div>
              <p className="font-semibold text-body text-lg mb-1.5">Time to bloom</p>
              <p className="text-sm text-subtle text-center max-w-[260px] mb-6">
                Add your first recipe to start building this event's floral design.
              </p>
              <Button size="sm" className="cursor-pointer gap-1 bg-forest text-cream hover:bg-forest/90" onClick={handleOpenBuildQuote}>
                <Flower2 className="w-3.5 h-3.5" /> Build Quote
              </Button>
            </div>
          )}

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

            const price = er.override_retail_price ?? 0
            const total = price * er.quantity

            return (
              <div key={er.id} className="bg-white rounded-xl border border-[#E8E0D8] px-5 py-4 flex items-center gap-3 group">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-[#4A3F35]">{recipe.name}</span>
                  {showPricing && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={() => handleQtyChange(er.id, Math.max(1, er.quantity - 1))}
                        className="w-5 h-5 rounded bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center text-xs cursor-pointer leading-none"
                      >–</button>
                      <span className="text-xs font-semibold text-body w-4 text-center tabular-nums">{er.quantity}</span>
                      <button
                        onClick={() => handleQtyChange(er.id, er.quantity + 1)}
                        className="w-5 h-5 rounded bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center text-xs cursor-pointer leading-none"
                      >+</button>
                      <span className="text-xs text-subtle ml-0.5">× {formatCurrency(price)} = <span className="font-medium text-body">{formatCurrency(total)}</span></span>
                    </div>
                  )}
                </div>

                <Button size="sm" variant="outline" className="cursor-pointer shrink-0 text-xs h-7 px-2.5">
                  Create Recipe
                </Button>

                <Button size="icon-sm" variant="ghost" className="cursor-pointer" onClick={() => setConfirmDeleteErid(er.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-[#C0392B]" />
                </Button>
              </div>
            )
          })}

        </div>

        {/* Event summary panel */}
        {showPricing && summary && (
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Event Summary</CardTitle>
                  <Badge variant={eventConfirmed ? 'green' : 'draft'}>
                    {eventConfirmed ? 'Event confirmed' : 'Event not confirmed'}
                  </Badge>
                </div>
              </CardHeader>
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
