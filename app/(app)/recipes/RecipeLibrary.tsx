'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, LayoutGrid, List, Copy, Archive, Calendar, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarginBadge } from '@/components/common/MarginBadge'
import { PaletteStrip } from '@/components/common/PaletteStrip'
import { createRecipe, duplicateRecipe, archiveRecipe } from './actions'
import { calculatePricingWaterfall } from '@/lib/pricing/engine'
import type { RecipeItem, Recipe } from '@/types/database'
import { EVENT_TYPE_LABELS } from '@/lib/constants'

type RecipeWithItems = Recipe & { recipe_items: Pick<RecipeItem, 'item_color_hex' | 'item_color_name' | 'item_type' | 'wholesale_cost_snapshot' | 'quantity'>[] }

interface RecipeLibraryProps {
  initialRecipes: RecipeWithItems[]
  defaultMarginTarget: number
  defaultFlowerMarkup: number
  defaultHardGoodsMarkup: number
  role: string
}

function computeMargin(
  recipe: RecipeWithItems,
  defaultFlowerMarkup: number,
  defaultHardGoodsMarkup: number
): number {
  if (!recipe.recipe_items?.length) return 0

  const items = recipe.recipe_items.map((ri, i) => ({
    id: String(i),
    itemType: ri.item_type,
    itemName: '', itemVariety: null, itemColorName: null, itemColorHex: null,
    itemUnit: null, itemImageUrl: null,
    wholesaleCostSnapshot: Number(ri.wholesale_cost_snapshot),
    quantity: Number(ri.quantity),
    notes: null, sortOrder: i,
  }))

  const settings = {
    flowerMarkup: recipe.flower_markup ?? defaultFlowerMarkup,
    hardGoodsMarkup: recipe.hardgoods_markup ?? defaultHardGoodsMarkup,
    rentalMarkup: recipe.rental_markup ?? 2.5,
    laborMode: recipe.labor_mode ?? 'percentage',
    designFeePct: recipe.design_fee_pct ?? 30,
    prepHours: recipe.prep_hours ?? 0,
    prepRate: recipe.prep_rate ?? 35,
    designHours: recipe.design_hours ?? 0,
    designRate: recipe.design_rate ?? 65,
    deliveryFee: 0,
    setupFee: 0,
    teardownFee: 0,
    deliveryFeeType: 'flat' as const,
    setupFeeType: 'flat' as const,
    teardownFeeType: 'flat' as const,
    taxRate: 0,
    marginTarget: 70,
  }

  const waterfall = calculatePricingWaterfall(items, settings)
  return waterfall.grossMarginPct
}

export function RecipeLibrary({
  initialRecipes,
  defaultMarginTarget,
  defaultFlowerMarkup,
  defaultHardGoodsMarkup,
  role,
}: RecipeLibraryProps) {
  const router = useRouter()
  const [recipes, setRecipes] = useState(initialRecipes)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterEventType, setFilterEventType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'updated_at' | 'name' | 'margin'>('updated_at')
  const [loading, setLoading] = useState(false)

  const handleNewRecipe = async () => {
    setLoading(true)
    const { data } = await createRecipe()
    if (data) router.push(`/recipes/${data.id}`)
    setLoading(false)
  }

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const { data } = await duplicateRecipe(id)
    if (data) setRecipes(r => [data as RecipeWithItems, ...r])
  }

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    await archiveRecipe(id)
    setRecipes(r => r.filter(rec => rec.id !== id))
  }

  const processedRecipes = useMemo(() => {
    let list = recipes.map(r => ({
      ...r,
      _margin: computeMargin(r, defaultFlowerMarkup, defaultHardGoodsMarkup),
    }))

    // Search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.event_type?.includes(q))
    }

    // Filter status
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus)
    if (filterEventType !== 'all') list = list.filter(r => r.event_type === filterEventType)

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'margin') return b._margin - a._margin
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

    return list
  }, [recipes, search, filterStatus, filterEventType, sortBy, defaultFlowerMarkup, defaultHardGoodsMarkup])

  // Keyboard shortcut: N = new recipe
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !(document.activeElement instanceof HTMLInputElement)) {
        handleNewRecipe()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Recipes</h1>
          <p className="text-sm text-[#A89880] mt-1">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={handleNewRecipe} disabled={loading}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Recipe
          <span className="ml-2 text-[#FFFFFF]/60 text-xs">N</span>
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A89880]" />
          <Input
            placeholder="Search recipes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 w-56"
          />
        </div>

        <Select value={filterEventType} onValueChange={setFilterEventType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Recipe category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at">Recently modified</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="margin">Margin %</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1 bg-[#F5F1EC] rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          >
            <LayoutGrid className="w-4 h-4 text-[#4A3F35]" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          >
            <List className="w-4 h-4 text-[#4A3F35]" />
          </button>
        </div>
      </div>

      {/* Recipe grid/list */}
      {processedRecipes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-24 text-center"
        >
          <p className="text-4xl mb-4">🌺</p>
          <p className="font-serif text-xl text-[#4A3F35] mb-2">No recipes yet</p>
          <p className="text-sm text-[#A89880] mb-6">
            {search ? 'No recipes match your search' : 'Create your first recipe to start building floral designs'}
          </p>
          {!search && (
            <Button onClick={handleNewRecipe}>
              <Plus className="w-4 h-4 mr-2" /> Create first recipe
            </Button>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {processedRecipes.map((recipe, i) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                margin={recipe._margin}
                marginTarget={defaultMarginTarget}
                index={i}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                showPricing={role !== 'staff'}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E0D8] bg-[#F5F1EC]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Recipe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Palette</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Status</th>
                {role !== 'staff' && <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Margin</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Modified</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {processedRecipes.map((recipe, i) => (
                <motion.tr
                  key={recipe.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                  className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#FAF7F2] cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm text-[#4A3F35]">{recipe.name}</p>
                    {recipe.event_type && (
                      <p className="text-xs text-[#A89880]">{EVENT_TYPE_LABELS[recipe.event_type]}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PaletteStrip
                      colors={recipe.recipe_items.filter(ri => ri.item_type === 'flower').map(ri => ({ hex: ri.item_color_hex, name: ri.item_color_name }))}
                      maxColors={6}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={recipe.status === 'active' ? 'active' : 'draft'} className="capitalize">{recipe.status}</Badge>
                  </td>
                  {role !== 'staff' && (
                    <td className="px-4 py-3 text-right">
                      <MarginBadge marginPct={recipe._margin} marginTarget={defaultMarginTarget} size="sm" />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-[#A89880]">
                    {new Date(recipe.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon-sm" variant="ghost" onClick={e => handleDuplicate(recipe.id, e)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={e => handleArchive(recipe.id, e)}>
                        <Archive className="w-3.5 h-3.5 text-[#A89880]" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Recipe Card ─────────────────────────────────────────────

function RecipeCard({
  recipe,
  margin,
  marginTarget,
  index,
  onDuplicate,
  onArchive,
  showPricing,
}: {
  recipe: RecipeWithItems
  margin: number
  marginTarget: number
  index: number
  onDuplicate: (id: string, e: React.MouseEvent) => void
  onArchive: (id: string, e: React.MouseEvent) => void
  showPricing: boolean
}) {
  const router = useRouter()
  const paletteColors = recipe.recipe_items
    .filter(ri => ri.item_type === 'flower')
    .map(ri => ({ hex: ri.item_color_hex, name: ri.item_color_name }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      onClick={() => router.push(`/recipes/${recipe.id}`)}
      className="bg-white rounded-xl border border-[#E8E0D8] p-5 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-[#4A3F35] truncate leading-tight">{recipe.name}</h3>
          {recipe.event_type && (
            <p className="text-xs text-[#A89880] mt-0.5">{EVENT_TYPE_LABELS[recipe.event_type]}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={e => onDuplicate(recipe.id, e)} className="p-1 rounded hover:bg-[#F5F1EC] transition-colors">
            <Copy className="w-3.5 h-3.5 text-[#A89880]" />
          </button>
          <button onClick={e => onArchive(recipe.id, e)} className="p-1 rounded hover:bg-[#F5F1EC] transition-colors">
            <Archive className="w-3.5 h-3.5 text-[#A89880]" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <PaletteStrip colors={paletteColors} maxColors={8} size="sm" />
      </div>

      <div className="flex items-center justify-between">
        <Badge variant={recipe.status === 'active' ? 'active' : 'draft'} className="text-xs capitalize">
          {recipe.status}
        </Badge>
        {showPricing && (
          <MarginBadge marginPct={margin} marginTarget={marginTarget} size="sm" />
        )}
      </div>

      <p className="text-xs text-[#A89880] mt-2">
        Modified {new Date(recipe.updated_at).toLocaleDateString()}
      </p>
    </motion.div>
  )
}
