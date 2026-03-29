'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Printer, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ColorSwatch } from '@/components/common/ColorSwatch'
import { calculateBunchesNeeded } from '@/lib/pricing/engine'
import type { Event, Recipe, RecipeItem } from '@/types/database'

type EventWithRecipes = Event & {
  event_recipes: Array<{
    id: string; quantity: number
    recipes: Recipe & { recipe_items: RecipeItem[] }
  }>
}

interface FlowerBase {
  rowKey: string
  flowerId: string | null
  name: string; variety: string | null; colorName: string | null; colorHex: string | null
  supplier: string | null; imageUrl: string | null
  defaultStemsPerBunch: number; unitCost: number; totalStems: number
}

interface FlowerRow extends FlowerBase {
  stemsPerBunch: number
  stemsWithBuffer: number
  bunchesNeeded: number       // recommended (calculated)
  actualBunches: number | null
  effectiveBunches: number    // actualBunches if set, else bunchesNeeded
  bunchCost: number           // cost of one bunch = stemsPerBunch × unitCost
  extraStems: number          // (effectiveBunches × stemsPerBunch) - stemsWithBuffer
  totalCost: number           // effectiveBunches × bunchCost
}

interface OrderGeneratorProps {
  events: EventWithRecipes[]
  defaultWasteBuffer: number
  preselectedEventId?: string
}

export function OrderGenerator({ events, defaultWasteBuffer, preselectedEventId }: OrderGeneratorProps) {
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    preselectedEventId ? new Set([preselectedEventId]) : new Set()
  )
  const [wasteBuffer, setWasteBuffer] = useState(defaultWasteBuffer)
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [stemsPerBunchOverrides, setStemsPerBunchOverrides] = useState<Map<string, number>>(new Map())
  const [actualBunchesOverrides, setActualBunchesOverrides] = useState<Map<string, number>>(new Map())

  const toggleEvent = (id: string) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setOverride = (rowKey: string, value: number) => {
    setStemsPerBunchOverrides(prev => {
      const next = new Map(prev)
      next.set(rowKey, value)
      return next
    })
  }

  const setActualBunches = (rowKey: string, value: number | null) => {
    setActualBunchesOverrides(prev => {
      const next = new Map(prev)
      if (value === null) next.delete(rowKey)
      else next.set(rowKey, value)
      return next
    })
  }

  // Aggregate raw stem counts (no bunch rounding yet)
  const aggregatedBase = useMemo(() => {
    const map = new Map<string, FlowerBase>()

    for (const event of events) {
      if (!selectedEventIds.has(event.id)) continue

      for (const er of event.event_recipes) {
        const recipe = er.recipes
        const qty = er.quantity

        for (const item of recipe.recipe_items) {
          if (item.item_type !== 'flower') continue

          const rowKey = item.flower_id ?? `misc-${item.item_name}`
          const existing = map.get(rowKey)
          const stems = Number(item.quantity) * qty

          if (existing) {
            existing.totalStems += stems
          } else {
            map.set(rowKey, {
              rowKey,
              flowerId: item.flower_id,
              name: item.item_name,
              variety: item.item_variety,
              colorName: item.item_color_name,
              colorHex: item.item_color_hex,
              supplier: null,
              imageUrl: item.item_image_url,
              defaultStemsPerBunch: 10,
              unitCost: Number(item.wholesale_cost_snapshot),
              totalStems: stems,
            })
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const sup = (a.supplier ?? 'zzz').localeCompare(b.supplier ?? 'zzz')
      if (sup !== 0) return sup
      return a.name.localeCompare(b.name)
    })
  }, [events, selectedEventIds])

  // Apply bunch calculations with per-row overrides
  const aggregated = useMemo((): FlowerRow[] => {
    return aggregatedBase.map(flower => {
      const stemsPerBunch = stemsPerBunchOverrides.get(flower.rowKey) ?? flower.defaultStemsPerBunch
      const { stemsWithBuffer, bunchesNeeded } = calculateBunchesNeeded(
        flower.totalStems, stemsPerBunch, wasteBuffer
      )
      const actualBunches = actualBunchesOverrides.get(flower.rowKey) ?? null
      const effectiveBunches = actualBunches ?? bunchesNeeded
      const bunchCost = stemsPerBunch * flower.unitCost
      const extraStems = (effectiveBunches * stemsPerBunch) - stemsWithBuffer
      return {
        ...flower,
        stemsPerBunch,
        stemsWithBuffer,
        bunchesNeeded,
        actualBunches,
        effectiveBunches,
        bunchCost,
        extraStems,
        totalCost: effectiveBunches * bunchCost,
      }
    })
  }, [aggregatedBase, stemsPerBunchOverrides, actualBunchesOverrides, wasteBuffer])

  const suppliers = useMemo(() => {
    const set = new Set(aggregated.map(f => f.supplier ?? 'Unknown'))
    return ['all', ...Array.from(set).sort()]
  }, [aggregated])

  const filtered = supplierFilter === 'all'
    ? aggregated
    : aggregated.filter(f => (f.supplier ?? 'Unknown') === supplierFilter)

  const totalStems = filtered.reduce((s, f) => s + f.totalStems, 0)
  const totalBunches = filtered.reduce((s, f) => s + f.effectiveBunches, 0)
  const totalCost = filtered.reduce((s, f) => s + f.totalCost, 0)

  const handlePrint = () => window.print()

  const handleCSV = () => {
    const rows = [
      ['Name', 'Variety', 'Color', 'Supplier', 'Stems from Recipes', 'Cost/Stem', 'Stems/Bunch', 'Recommended Bunches', 'Actual Bunches', 'Bunch Cost', 'Extra Stems', 'Total Cost'].join(','),
      ...filtered.map(f => [
        f.name, f.variety ?? '', f.colorName ?? '', f.supplier ?? '',
        f.totalStems,
        f.unitCost.toFixed(2),
        f.stemsPerBunch,
        f.bunchesNeeded,
        f.actualBunches ?? '',
        f.bunchCost.toFixed(2),
        f.extraStems,
        f.totalCost.toFixed(2),
      ].join(',')),
    ].join('\n')

    const blob = new Blob([rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `petal-order-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Event selector */}
      <div className="col-span-1">
        <h3 className="font-medium text-sm text-[#4A3F35] mb-3">Select Events</h3>
        <div className="space-y-2">
          {events.map(event => (
            <label key={event.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedEventIds.has(event.id)}
                onChange={() => toggleEvent(event.id)}
                className="rounded border-[#E8E0D8] text-[#2D5016] focus:ring-[#2D5016]"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#4A3F35] group-hover:text-[#2D5016] truncate">{event.name}</p>
                {event.event_date && (
                  <p className="text-xs text-[#A89880]">
                    {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            </label>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-[#A89880]">No events yet</p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Waste buffer %</Label>
            <Input
              type="number"
              min="0"
              max="50"
              value={wasteBuffer}
              onChange={e => setWasteBuffer(parseFloat(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Order table */}
      <div className="col-span-3">
        {selectedEventIds.size === 0 ? (
          <div className="bg-white rounded-xl border border-[#E8E0D8] py-16 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="font-medium text-[#4A3F35]">Select events to generate an order</p>
            <p className="text-sm text-[#A89880] mt-1">Choose one or more events from the left panel</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-[#A89880]">Supplier:</Label>
                <select
                  value={supplierFilter}
                  onChange={e => setSupplierFilter(e.target.value)}
                  className="text-sm border border-[#E8E0D8] rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-[#2D5016]"
                >
                  {suppliers.map(s => <option key={s} value={s}>{s === 'all' ? 'All suppliers' : s}</option>)}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1.5" /> Print
                </Button>
              </div>
            </div>

            {/* Summary strip */}
            <div className="flex items-center gap-6 bg-[#2D5016]/5 rounded-xl px-4 py-3 mb-4">
              <div className="text-center">
                <p className="text-xs text-[#A89880]">Total Stems</p>
                <p className="font-serif font-semibold text-[#2D5016]">{totalStems}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#A89880]">Total Bunches</p>
                <p className="font-serif font-semibold text-[#2D5016]">{totalBunches}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#A89880]">Estimated Cost</p>
                <p className="font-serif font-semibold text-[#2D5016]">${totalCost.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#A89880]">Buffer</p>
                <p className="font-serif font-semibold text-[#2D5016]">{wasteBuffer}%</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-[#E8E0D8] bg-[#F5F1EC]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Flower</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Color</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Stems</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Cost/Stem</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Stems/Bunch</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Recommended Bunches</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Actual Bunches</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Bunch Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Extra Stems</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((flower, i) => (
                    <motion.tr
                      key={`${flower.flowerId ?? flower.name}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#FAF7F2]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {flower.imageUrl && (
                            <img src={flower.imageUrl} alt={flower.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-[#4A3F35]">{flower.name}</p>
                            {flower.variety && <p className="text-xs text-[#A89880]">{flower.variety}</p>}
                            {flower.supplier && <p className="text-xs text-[#A89880]">{flower.supplier}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {flower.colorName ? (
                          <div className="flex items-center gap-1.5">
                            <ColorSwatch hex={flower.colorHex} size="sm" />
                            <span className="text-sm text-[#4A3F35]">{flower.colorName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-[#A89880]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">{flower.totalStems}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-[#A89880]">
                        ${flower.unitCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="1"
                          value={flower.stemsPerBunch}
                          onChange={e => setOverride(flower.rowKey, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 text-right font-mono text-sm border border-[#E8E0D8] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#2D5016] bg-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="default" className="font-mono">{flower.bunchesNeeded}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={flower.actualBunches ?? ''}
                          placeholder={String(flower.bunchesNeeded)}
                          onChange={e => {
                            const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0)
                            setActualBunches(flower.rowKey, val)
                          }}
                          className="w-14 text-right font-mono text-sm border border-[#E8E0D8] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#2D5016] bg-white placeholder:text-[#C5B9AE]"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-[#A89880]">
                        ${flower.bunchCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-[#2D5016]/60">
                        {flower.extraStems >= 0 ? `+${flower.extraStems}` : flower.extraStems}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-[#4A3F35]">
                        ${flower.totalCost.toFixed(2)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#E8E0D8] bg-[#F5F1EC]">
                    <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Totals</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-sm">{totalStems}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-mono font-semibold text-sm">{filtered.reduce((s, f) => s + f.bunchesNeeded, 0)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-sm">{totalBunches}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-[#2D5016]">${totalCost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
