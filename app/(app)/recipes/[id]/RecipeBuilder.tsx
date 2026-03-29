'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Copy, Share2, Archive, Plus, Search, GripVertical, Trash2,
  ArrowRightLeft, AlertTriangle, ChevronDown, ExternalLink, Check,
  ToggleLeft, ToggleRight, ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MarginBadge } from '@/components/common/MarginBadge'
import { PaletteStrip } from '@/components/common/PaletteStrip'
import { ColorSwatch } from '@/components/common/ColorSwatch'
import { SaveIndicator } from '@/components/common/SaveIndicator'
import {
  updateRecipe, updateRecipeItem, addRecipeItem, removeRecipeItem,
  reorderRecipeItems, duplicateRecipe, archiveRecipe, toggleShareToken,
} from '../actions'
import { calculatePricingWaterfall, calculateWorkBack, formatCurrency, formatPct } from '@/lib/pricing/engine'
import { isSeasonalWarning } from '@/lib/utils'
import type { Recipe, RecipeItem, Flower, HardGood, Rental, StudioSettings } from '@/types/database'
import { EVENT_TYPE_OPTIONS } from '@/lib/constants'

interface RecipeBuilderProps {
  recipe: Recipe & { recipe_items: RecipeItem[] }
  settings: StudioSettings | null
  flowers: Flower[]
  hardGoods: HardGood[]
  rentals: Rental[]
  role: string
  fromEvent?: { id: string; name: string } | null
}

export function RecipeBuilder({
  recipe: initialRecipe,
  settings,
  flowers,
  hardGoods,
  rentals,
  role,
  fromEvent,
}: RecipeBuilderProps) {
  const router = useRouter()
  const [recipe, setRecipe] = useState(initialRecipe)
  const [items, setItems] = useState<RecipeItem[]>(
    [...initialRecipe.recipe_items].sort((a, b) => a.sort_order - b.sort_order)
  )
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(recipe.name)
  const [showItemSearch, setShowItemSearch] = useState(false)
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'flowers' | 'hard_goods' | 'rentals'>('flowers')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resolve settings (recipe-level overrides or studio defaults)
  // Services, tax, and margin target are now set at the event level.
  const pricingSettings = {
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
    marginTarget: settings?.default_margin_target ?? 70,
  }

  // Convert recipe items to pricing line items
  const lineItems = items.map(i => ({
    id: i.id,
    itemType: i.item_type,
    itemName: i.item_name,
    itemVariety: i.item_variety,
    itemColorName: i.item_color_name,
    itemColorHex: i.item_color_hex,
    itemUnit: i.item_unit,
    itemImageUrl: i.item_image_url,
    wholesaleCostSnapshot: Number(i.wholesale_cost_snapshot),
    quantity: Number(i.quantity),
    notes: i.notes,
    sortOrder: i.sort_order,
  }))

  const waterfall = calculatePricingWaterfall(lineItems, pricingSettings)
  const workBack = recipe.pricing_mode === 'work_back' && recipe.target_retail_price
    ? calculateWorkBack(recipe.target_retail_price, lineItems, pricingSettings)
    : null

  // Debounced autosave
  const scheduleAutosave = useCallback((updates: Partial<Recipe>) => {
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await updateRecipe(recipe.id, updates)
      setSaveStatus('saved')
    }, 1000)
  }, [recipe.id])

  const updateLocal = (updates: Partial<Recipe>) => {
    setRecipe(r => ({ ...r, ...updates }))
    scheduleAutosave(updates)
  }

  // Cmd+S save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }
        setSaveStatus('saving')
        updateRecipe(recipe.id, recipe).then(() => setSaveStatus('saved'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [recipe])

  const handleAddItem = async (
    type: RecipeItem['item_type'],
    source: Flower | HardGood | Rental | null,
    miscName?: string,
    miscCost?: number
  ) => {
    let newItem: Partial<RecipeItem>
    const nextOrder = Math.max(...items.map(i => i.sort_order), -1) + 1

    if (type === 'misc' || !source) {
      newItem = {
        item_type: 'misc',
        item_name: miscName ?? 'Misc item',
        wholesale_cost_snapshot: miscCost ?? 0,
        quantity: 1,
        sort_order: nextOrder,
      }
    } else if (type === 'flower') {
      const f = source as Flower
      newItem = {
        item_type: 'flower',
        flower_id: f.id,
        item_name: f.name,
        item_variety: f.variety,
        item_color_name: f.color_name,
        item_color_hex: f.color_hex,
        item_unit: f.unit,
        item_image_url: f.image_url,
        wholesale_cost_snapshot: f.wholesale_cost_per_stem,
        quantity: 1,
        sort_order: nextOrder,
      }
    } else if (type === 'hard_good') {
      const g = source as HardGood
      newItem = {
        item_type: 'hard_good',
        hard_good_id: g.id,
        item_name: g.name,
        item_unit: g.unit,
        item_image_url: g.image_url,
        wholesale_cost_snapshot: g.wholesale_cost,
        quantity: 1,
        sort_order: nextOrder,
      }
    } else {
      const r = source as Rental
      const costPerUse = r.times_used > 0 ? r.acquisition_cost / r.times_used : r.acquisition_cost
      newItem = {
        item_type: 'rental',
        rental_id: r.id,
        item_name: r.name,
        item_image_url: r.image_url,
        wholesale_cost_snapshot: costPerUse,
        quantity: 1,
        sort_order: nextOrder,
      }
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimistic = { ...newItem, id: tempId, recipe_id: recipe.id, created_at: new Date().toISOString() } as RecipeItem
    setItems(prev => [...prev, optimistic])
    setShowItemSearch(false)
    setItemSearchQuery('')

    const { data, error } = await addRecipeItem(recipe.id, newItem)
    if (data && !error) {
      setItems(prev => prev.map(i => i.id === tempId ? data : i))
    } else {
      setItems(prev => prev.filter(i => i.id !== tempId))
    }
    setSaveStatus('saved')
  }

  const handleQtyChange = useCallback(async (id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
    await updateRecipeItem(id, { quantity: qty })
  }, [])

  const handleRemoveItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await removeRecipeItem(id)
  }

  const handleReorder = async (newItems: RecipeItem[]) => {
    const reordered = newItems.map((item, index) => ({ ...item, sort_order: index }))
    setItems(reordered)
    await reorderRecipeItems(reordered.map(i => ({ id: i.id, sort_order: i.sort_order })))
  }

  const handleShare = async () => {
    const { shareToken } = await toggleShareToken(recipe.id, true)
    if (shareToken) {
      const url = `${window.location.origin}/share/${shareToken}`
      setShareUrl(url)
    }
    setShareDialogOpen(true)
  }

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Filtered items by tab
  const flowerItems = items.filter(i => i.item_type === 'flower')
  const hardGoodItems = items.filter(i => i.item_type === 'hard_good')
  const rentalItems = items.filter(i => i.item_type === 'rental' || i.item_type === 'misc')

  // Color palette from flowers
  const paletteColors = flowerItems.map(i => ({ hex: i.item_color_hex, name: i.item_color_name }))

  // Search for items to add
  const searchResults = (() => {
    const q = itemSearchQuery.toLowerCase()
    if (!q) {
      if (activeTab === 'flowers') return flowers.slice(0, 8)
      if (activeTab === 'hard_goods') return hardGoods.slice(0, 8)
      return rentals.slice(0, 8)
    }
    if (activeTab === 'flowers') {
      return flowers.filter(f => f.name.toLowerCase().includes(q) || f.variety?.toLowerCase().includes(q)).slice(0, 12)
    }
    if (activeTab === 'hard_goods') {
      return hardGoods.filter(g => g.name.toLowerCase().includes(q)).slice(0, 12)
    }
    return rentals.filter(r => r.name.toLowerCase().includes(q)).slice(0, 12)
  })()

  const showPricing = role !== 'staff'

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-screen -m-8">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-white border-b border-[#E8E0D8]">

          {/* Row 1 — Identity */}
          <div className="px-8 py-3">
            <div className="max-w-[1280px] mx-auto flex items-center gap-3">
              {/* Back to event */}
              {fromEvent && (
                <>
                  <Link
                    href={`/events/${fromEvent.id}`}
                    className="flex items-center gap-1 text-sm text-[#A89880] hover:text-[#4A3F35] transition-colors shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {fromEvent.name}
                  </Link>
                  <div className="w-px h-4 bg-[#E8E0D8] shrink-0" />
                </>
              )}

              {/* Recipe name */}
              {editingName ? (
                <input
                  autoFocus
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={() => {
                    setEditingName(false)
                    if (nameValue !== recipe.name) updateLocal({ name: nameValue })
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setEditingName(false)
                      if (nameValue !== recipe.name) updateLocal({ name: nameValue })
                    }
                    if (e.key === 'Escape') {
                      setEditingName(false)
                      setNameValue(recipe.name)
                    }
                  }}
                  className="font-serif text-xl font-semibold text-[#4A3F35] bg-transparent border-b-2 border-[#2D5016] outline-none min-w-[200px]"
                />
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="font-serif text-xl font-semibold text-[#4A3F35] hover:text-[#2D5016] transition-colors"
                >
                  {recipe.name}
                </button>
              )}

              {/* Status badge */}
              <Badge
                variant={recipe.status === 'active' ? 'active' : 'draft'}
                className="capitalize cursor-pointer shrink-0"
                onClick={() => updateLocal({ status: recipe.status === 'draft' ? 'active' : 'draft' })}
              >
                {recipe.status}
              </Badge>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Save indicator */}
              <SaveIndicator status={saveStatus} />

              {/* Divider */}
              <div className="w-px h-4 bg-[#E8E0D8] shrink-0" />

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#4A3F35] hover:text-[#2D5016] hover:bg-[#F5F1EC]"
                  onClick={() => duplicateRecipe(recipe.id).then(({ data }) => data && router.push(`/recipes/${data.id}`))}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#4A3F35] hover:text-[#2D5016] hover:bg-[#F5F1EC]"
                  onClick={handleShare}
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#A89880] hover:text-[#C0392B] hover:bg-[#FFF5F5]"
                      onClick={() => archiveRecipe(recipe.id).then(() => router.push('/recipes'))}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Archive recipe</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Row 2 — Configuration strip */}
          <div className="px-8 py-2 bg-[#FAF7F2] border-t border-[#E8E0D8]">
            <div className="max-w-[1280px] mx-auto flex items-center gap-3">
              {/* Category */}
              <Select
                value={recipe.event_type ?? ''}
                onValueChange={v => updateLocal({ event_type: v as Recipe['event_type'] })}
              >
                <SelectTrigger className="w-44 h-7 text-xs bg-white">
                  <SelectValue placeholder="Recipe category…" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {showPricing && <div className="w-px h-4 bg-[#E8E0D8] shrink-0" />}

              {/* Pricing mode toggle */}
              {showPricing && (
                <div className="flex items-center bg-white rounded-lg border border-[#E8E0D8] p-0.5">
                  <button
                    onClick={() => updateLocal({ pricing_mode: 'build_up' })}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${recipe.pricing_mode === 'build_up' ? 'bg-[#2D5016] text-white shadow-sm' : 'text-[#A89880] hover:text-[#4A3F35]'}`}
                  >
                    Build-up
                  </button>
                  <button
                    onClick={() => updateLocal({ pricing_mode: 'work_back' })}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${recipe.pricing_mode === 'work_back' ? 'bg-[#2D5016] text-white shadow-sm' : 'text-[#A89880] hover:text-[#4A3F35]'}`}
                  >
                    Work-back
                  </button>
                </div>
              )}

              {/* Target price — only in work-back mode */}
              {showPricing && recipe.pricing_mode === 'work_back' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#A89880]">Target</span>
                  <div className="flex items-center bg-white border border-[#E8E0D8] rounded-md overflow-hidden">
                    <span className="text-xs text-[#A89880] pl-2">$</span>
                    <input
                      type="number"
                      value={recipe.target_retail_price ?? ''}
                      onChange={e => updateLocal({ target_retail_price: parseFloat(e.target.value) || null })}
                      className="w-20 text-xs font-medium text-[#4A3F35] bg-transparent px-2 py-1 outline-none focus:ring-2 focus:ring-[#2D5016]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {/* Margin badge */}
              {showPricing && (
                <MarginBadge
                  marginPct={waterfall.grossMarginPct}
                  marginTarget={pricingSettings.marginTarget}
                  size="sm"
                />
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Color palette — decorative, right-aligned */}
              <PaletteStrip colors={paletteColors} maxColors={8} size="xs" />
            </div>
          </div>

        </div>

        {/* Work-back banner */}
        {recipe.pricing_mode === 'work_back' && workBack && showPricing && (
          <div className="bg-[#2D5016]/5 border-b border-[#2D5016]/10 px-8 py-3">
            <div className="max-w-[1280px] mx-auto flex items-center gap-6 text-sm">
              <span className="font-medium text-[#2D5016]">
                Target retail: {formatCurrency(workBack.targetRetail)}
              </span>
              <span className="text-[#A89880]">→</span>
              <span>
                Available for flowers: <strong className="text-[#2D5016]">{formatCurrency(workBack.availableForMaterials)}</strong>
              </span>
              {workBack.totalStems > 0 && (
                <span className="text-[#A89880]">
                  ({formatCurrency(workBack.availablePerStem)} avg per stem across {workBack.totalStems} stems)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Body: two columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Ingredient list */}
          <div className="flex-1 p-8 overflow-y-auto border-r border-[#E8E0D8]">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="flowers">
                    Flowers
                    {flowerItems.length > 0 && <span className="ml-1 text-xs text-[#A89880]">{flowerItems.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="hard_goods">
                    Hard Goods
                    {hardGoodItems.length > 0 && <span className="ml-1 text-xs text-[#A89880]">{hardGoodItems.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="rentals">
                    Rentals / Misc
                    {rentalItems.length > 0 && <span className="ml-1 text-xs text-[#A89880]">{rentalItems.length}</span>}
                  </TabsTrigger>
                </TabsList>
                <Button size="sm" onClick={() => setShowItemSearch(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add
                </Button>
              </div>

              <TabsContent value="flowers">
                <IngredientList
                  items={flowerItems}
                  onReorder={handleReorder}
                  onQtyChange={handleQtyChange}
                  onRemove={handleRemoveItem}
                  showPricing={showPricing}
                  emptyMessage="Start by adding a flower ↑"
                  emptySubtext="Search your catalog or press Add above"
                  suggestions={flowers.slice(0, 3)}
                  onAddSuggestion={f => handleAddItem('flower', f as Flower)}
                />
              </TabsContent>
              <TabsContent value="hard_goods">
                <IngredientList
                  items={hardGoodItems}
                  onReorder={handleReorder}
                  onQtyChange={handleQtyChange}
                  onRemove={handleRemoveItem}
                  showPricing={showPricing}
                  emptyMessage="No hard goods added yet"
                  emptySubtext="Add containers, foam, ribbon, and other supplies"
                  suggestions={[]}
                  onAddSuggestion={() => {}}
                />
              </TabsContent>
              <TabsContent value="rentals">
                <IngredientList
                  items={rentalItems}
                  onReorder={handleReorder}
                  onQtyChange={handleQtyChange}
                  onRemove={handleRemoveItem}
                  showPricing={showPricing}
                  emptyMessage="No rentals or misc items yet"
                  emptySubtext="Add rental items or one-off miscellaneous costs"
                  suggestions={[]}
                  onAddSuggestion={() => {}}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: Pricing waterfall */}
          {showPricing && (
            <div className="w-80 flex-shrink-0 p-6 overflow-y-auto">
              <PricingWaterfallPanel
                waterfall={waterfall}
                pricingSettings={pricingSettings}
                recipe={recipe}
                onUpdateSettings={(updates) => updateLocal(updates)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Item search modal */}
      <AnimatePresence>
        {showItemSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowItemSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E8E0D8] overflow-hidden"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E0D8]">
                <Search className="w-4 h-4 text-[#A89880] flex-shrink-0" />
                <input
                  autoFocus
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  placeholder="Search flowers, hard goods, rentals…"
                  className="flex-1 outline-none text-sm text-[#4A3F35] placeholder:text-[#A89880]"
                />
                <kbd className="text-xs text-[#A89880] bg-[#F5F1EC] px-1.5 py-0.5 rounded">ESC</kbd>
              </div>

              {/* Tab filter */}
              <div className="flex border-b border-[#E8E0D8]">
                {(['flowers', 'hard_goods', 'rentals'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === tab ? 'text-[#2D5016] border-b-2 border-[#2D5016]' : 'text-[#A89880] hover:text-[#4A3F35]'}`}
                  >
                    {tab === 'flowers' ? 'Flowers' : tab === 'hard_goods' ? 'Hard Goods' : 'Rentals'}
                  </button>
                ))}
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto">
                {searchResults.map(item => {
                  const isFlower = activeTab === 'flowers'
                  const isHG = activeTab === 'hard_goods'
                  const f = item as Flower
                  const g = item as HardGood
                  const r = item as Rental

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const type = activeTab === 'flowers' ? 'flower' : activeTab === 'hard_goods' ? 'hard_good' : 'rental'
                        handleAddItem(type as RecipeItem['item_type'], item as Flower | HardGood | Rental)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F1EC] transition-colors text-left"
                    >
                      {isFlower && f.image_url ? (
                        <img src={f.image_url} alt={f.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                      ) : isFlower ? (
                        <ColorSwatch hex={f.color_hex} size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-[#F5F1EC] flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#4A3F35] truncate">
                          {isFlower ? `${f.name}${f.variety ? ` – ${f.variety}` : ''}` : isHG ? g.name : r.name}
                        </p>
                        <p className="text-xs text-[#A89880]">
                          {isFlower ? `$${Number(f.wholesale_cost_per_stem).toFixed(2)}/stem` :
                           isHG ? `$${Number(g.wholesale_cost).toFixed(2)}/${g.unit}` :
                           `$${(r.acquisition_cost / Math.max(r.times_used, 1)).toFixed(2)}/use`}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-[#A89880] flex-shrink-0" />
                    </button>
                  )
                })}

                {searchResults.length === 0 && itemSearchQuery && (
                  <div className="py-8 text-center text-sm text-[#A89880]">No results for "{itemSearchQuery}"</div>
                )}

                {/* Misc item row */}
                {activeTab === 'rentals' && (
                  <div className="px-4 py-3 border-t border-[#E8E0D8]">
                    <MiscItemRow onAdd={(name, cost) => handleAddItem('misc', null, name, cost)} />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with staff</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#A89880]">
            This link shows staff the recipe without any pricing information.
          </p>
          {shareUrl && (
            <div className="flex items-center gap-2 bg-[#F5F1EC] rounded-lg px-3 py-2">
              <code className="text-xs text-[#4A3F35] flex-1 truncate">{shareUrl}</code>
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4 text-[#27AE60]" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              toggleShareToken(recipe.id, false)
              setShareDialogOpen(false)
            }}
          >
            Deactivate link
          </Button>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

// ─── Ingredient List ─────────────────────────────────────────

function IngredientList({
  items, onReorder, onQtyChange, onRemove, showPricing,
  emptyMessage, emptySubtext, suggestions, onAddSuggestion,
}: {
  items: RecipeItem[]
  onReorder: (items: RecipeItem[]) => void
  onQtyChange: (id: string, qty: number) => void
  onRemove: (id: string) => void
  showPricing: boolean
  emptyMessage: string
  emptySubtext: string
  suggestions: Flower[]
  onAddSuggestion: (f: Flower) => void
}) {
  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
        <p className="text-3xl mb-3">🌸</p>
        <p className="font-medium text-[#4A3F35] mb-1">{emptyMessage}</p>
        <p className="text-sm text-[#A89880]">{emptySubtext}</p>
        {suggestions.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-[#A89880] mb-2 font-medium uppercase tracking-wide">Quick add</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(f => (
                <button
                  key={f.id}
                  onClick={() => onAddSuggestion(f)}
                  className="flex items-center gap-1.5 text-sm bg-white border border-[#E8E0D8] rounded-full px-3 py-1.5 hover:border-[#2D5016] hover:text-[#2D5016] transition-colors"
                >
                  <ColorSwatch hex={f.color_hex} size="xs" />
                  {f.name}{f.variety ? ` – ${f.variety}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  const total = items.reduce((sum, i) => sum + Number(i.wholesale_cost_snapshot) * Number(i.quantity), 0)

  return (
    <div>
      <Reorder.Group axis="y" values={items} onReorder={onReorder} className="space-y-1">
        {items.map((item, idx) => (
          <Reorder.Item key={item.id} value={item}>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 bg-white rounded-xl border border-[#E8E0D8] px-3 py-2.5 group hover:border-[#2D5016]/30 transition-colors"
            >
              {/* Drag handle */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-[#A89880]" />
              </div>

              {/* Thumbnail / swatch */}
              {item.item_image_url ? (
                <img src={item.item_image_url} alt={item.item_name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
              ) : (
                <ColorSwatch hex={item.item_color_hex} size="sm" />
              )}

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#4A3F35] truncate">
                  {item.item_name}
                  {item.item_variety && <span className="text-[#A89880] font-normal"> – {item.item_variety}</span>}
                </p>
                {item.item_color_name && (
                  <p className="text-xs text-[#A89880]">{item.item_color_name}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onQtyChange(item.id, Math.max(0.5, Number(item.quantity) - 1))}
                  className="w-6 h-6 rounded-md bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center text-sm transition-colors"
                >–</button>
                <input
                  data-qty-input
                  type="number"
                  value={item.quantity}
                  min="0.5"
                  step="1"
                  onChange={e => onQtyChange(item.id, parseFloat(e.target.value) || 1)}
                  className="w-12 text-center text-sm font-medium text-[#4A3F35] bg-transparent outline-none focus:ring-2 focus:ring-blue-500 rounded"
                />
                <button
                  onClick={() => onQtyChange(item.id, Number(item.quantity) + 1)}
                  className="w-6 h-6 rounded-md bg-[#F5F1EC] hover:bg-[#E8E0D8] flex items-center justify-center text-sm transition-colors"
                >+</button>
              </div>

              {/* Unit & cost */}
              {showPricing && (
                <div className="text-right w-24">
                  <p className="text-sm font-mono font-medium text-[#4A3F35]">
                    ${(Number(item.wholesale_cost_snapshot) * Number(item.quantity)).toFixed(2)}
                  </p>
                  <p className="text-xs text-[#A89880]">
                    ${Number(item.wholesale_cost_snapshot).toFixed(2)} ea
                  </p>
                </div>
              )}

              {/* Remove */}
              <button
                onClick={() => onRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#F5F1EC]"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#C0392B]" />
              </button>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {showPricing && (
        <div className="flex items-center justify-between px-3 py-2 mt-2 bg-[#F5F1EC] rounded-lg">
          <span className="text-xs font-semibold text-[#A89880] uppercase tracking-wide">Subtotal (COGS)</span>
          <span className="text-sm font-mono font-semibold text-[#4A3F35]">${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Misc Item Row ────────────────────────────────────────────

function MiscItemRow({ onAdd }: { onAdd: (name: string, cost: number) => void }) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')

  return (
    <div>
      <p className="text-xs font-semibold text-[#A89880] uppercase tracking-wide mb-2">Add misc item (one-off)</p>
      <div className="flex items-center gap-2">
        <Input placeholder="Item name" value={name} onChange={e => setName(e.target.value)} className="flex-1 h-8 text-sm" />
        <div className="flex items-center">
          <span className="text-sm text-[#A89880] mr-1">$</span>
          <Input type="number" placeholder="0.00" value={cost} onChange={e => setCost(e.target.value)} className="w-20 h-8 text-sm" />
        </div>
        <Button
          size="sm"
          disabled={!name.trim()}
          onClick={() => { onAdd(name, parseFloat(cost) || 0); setName(''); setCost('') }}
        >
          Add
        </Button>
      </div>
    </div>
  )
}

// ─── Pricing Waterfall Panel ──────────────────────────────────

function PricingWaterfallPanel({
  waterfall,
  pricingSettings,
  recipe,
  onUpdateSettings,
}: {
  waterfall: ReturnType<typeof calculatePricingWaterfall>
  pricingSettings: Parameters<typeof calculatePricingWaterfall>[1]
  recipe: Recipe
  onUpdateSettings: (u: Partial<Recipe>) => void
}) {
  const $ = (v: number) => formatCurrency(v)
  const pct = (v: number) => formatPct(v)

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <p className="text-xs font-semibold text-[#A89880] uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  )

  const Row = ({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) => (
    <div className={`flex items-center justify-between py-1 ${muted ? 'text-[#A89880]' : 'text-[#4A3F35]'}`}>
      <span className={`text-xs ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        className={`text-xs font-mono ${bold ? 'font-semibold' : ''}`}
      >
        {value}
      </motion.span>
    </div>
  )

  const InlineEdit = ({ label, value, field, suffix = '' }: { label: string; value: number; field: keyof Recipe; suffix?: string }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[#A89880]">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onUpdateSettings({ [field]: parseFloat(e.target.value) || 0 } as Partial<Recipe>)}
          className="w-16 text-right text-xs font-mono text-[#4A3F35] bg-white border border-[#E8E0D8] rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-[#2D5016]"
        />
        {suffix && <span className="text-xs text-[#A89880]">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="space-y-1">
      <h3 className="font-serif font-semibold text-[#4A3F35] mb-4">Pricing</h3>

      <Section title="Materials (COGS)">
        <Row label="Flowers" value={$(waterfall.materials.flowersCOGS)} />
        <Row label="Hard Goods" value={$(waterfall.materials.hardGoodsCOGS)} />
        <Row label="Rentals" value={$(waterfall.materials.rentalsCOGS)} />
        {waterfall.materials.miscCOGS > 0 && <Row label="Misc" value={$(waterfall.materials.miscCOGS)} />}
        <div className="border-t border-[#E8E0D8] my-1" />
        <Row label="Total COGS" value={$(waterfall.materials.totalCOGS)} bold />
      </Section>

      <Section title="Marked-up Materials">
        <InlineEdit label={`Flowers ×`} value={pricingSettings.flowerMarkup} field="flower_markup" suffix="x" />
        <Row label="Flowers (marked up)" value={$(waterfall.markedUp.flowersMarkedUp)} muted />
        <InlineEdit label={`Hard Goods ×`} value={pricingSettings.hardGoodsMarkup} field="hardgoods_markup" suffix="x" />
        <Row label="Hard Goods (marked up)" value={$(waterfall.markedUp.hardGoodsMarkedUp)} muted />
        <InlineEdit label={`Rentals ×`} value={pricingSettings.rentalMarkup} field="rental_markup" suffix="x" />
        <Row label="Rentals (marked up)" value={$(waterfall.markedUp.rentalsMarkedUp)} muted />
        <div className="border-t border-[#E8E0D8] my-1" />
        <Row label="Marked-up Subtotal" value={$(waterfall.markedUp.markedUpSubtotal)} bold />
      </Section>

      <Section title="Labor">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => onUpdateSettings({ labor_mode: 'percentage' })}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${pricingSettings.laborMode === 'percentage' ? 'bg-[#2D5016] text-white' : 'bg-[#F5F1EC] text-[#A89880]'}`}
          >% of subtotal</button>
          <button
            onClick={() => onUpdateSettings({ labor_mode: 'hourly' })}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${pricingSettings.laborMode === 'hourly' ? 'bg-[#2D5016] text-white' : 'bg-[#F5F1EC] text-[#A89880]'}`}
          >Hourly</button>
        </div>

        {pricingSettings.laborMode === 'percentage' ? (
          <InlineEdit label="Design fee" value={pricingSettings.designFeePct} field="design_fee_pct" suffix="%" />
        ) : (
          <>
            <InlineEdit label="Prep hours" value={pricingSettings.prepHours} field="prep_hours" />
            <InlineEdit label="Prep rate" value={pricingSettings.prepRate} field="prep_rate" suffix="$/hr" />
            <InlineEdit label="Design hours" value={pricingSettings.designHours} field="design_hours" />
            <InlineEdit label="Design rate" value={pricingSettings.designRate} field="design_rate" suffix="$/hr" />
          </>
        )}
        <div className="border-t border-[#E8E0D8] my-1" />
        <Row label="Total Labor" value={$(waterfall.labor.totalLabor)} bold />
      </Section>

      <Section title="Recipe Subtotal">
        <Row label="Recipe Subtotal" value={$(waterfall.recipeSubtotal)} bold />
        <p className="text-xs text-[#A89880] mt-2 italic">Services, tax &amp; final pricing are set at the event level.</p>
      </Section>
    </div>
  )
}
