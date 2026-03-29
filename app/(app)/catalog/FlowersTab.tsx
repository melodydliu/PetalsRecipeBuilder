'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Trash2, Edit2, AlertCircle, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ColorSwatch } from '@/components/common/ColorSwatch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createFlower, updateFlower, deleteFlower, updateFlowerPrice, pushPriceToRecipes, seedFromMasterLibrary } from './actions'
import { masterFlowerLibrary } from '@/lib/data/master-flower-library'
import type { Flower } from '@/types/database'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const BOTANICAL_COLORS = [
  { name: 'Cream', hex: '#F5EFE6' }, { name: 'Blush', hex: '#F2D0C8' },
  { name: 'Dusty Rose', hex: '#C4867A' }, { name: 'Burgundy', hex: '#6B2030' },
  { name: 'Coral', hex: '#E8785A' }, { name: 'Peach', hex: '#F0B898' },
  { name: 'Ivory', hex: '#FFFFF0' }, { name: 'White', hex: '#FAFAFA' },
  { name: 'Sage', hex: '#7A9970' }, { name: 'Eucalyptus', hex: '#82A090' },
  { name: 'Forest', hex: '#2D5016' }, { name: 'Chartreuse', hex: '#B8CF6C' },
  { name: 'Lavender', hex: '#C4B8D8' }, { name: 'Lilac', hex: '#B898C8' },
  { name: 'Dusty Blue', hex: '#7898B0' }, { name: 'Navy', hex: '#1A2848' },
  { name: 'Champagne', hex: '#D4C090' }, { name: 'Gold', hex: '#C9A84C' },
  { name: 'Terracotta', hex: '#B85A38' }, { name: 'Chocolate', hex: '#4A2818' },
  { name: 'Black', hex: '#1A1A1A' },
]

interface FlowersTabProps {
  flowers: Flower[]
  onUpdate: (flowers: Flower[]) => void
}

interface FlowerForm {
  name: string; variety: string; color_name: string; color_hex: string
  unit: string; stems_per_bunch: string; wholesale_cost_per_stem: string
  wholesale_cost_per_bunch: string
  supplier: string; notes: string; seasonal_months: number[]
}

const emptyForm: FlowerForm = {
  name: '', variety: '', color_name: '', color_hex: '',
  unit: 'stem', stems_per_bunch: '10', wholesale_cost_per_stem: '0',
  wholesale_cost_per_bunch: '0',
  supplier: '', notes: '', seasonal_months: [],
}

export function FlowersTab({ flowers, onUpdate }: FlowersTabProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSeed, setShowSeed] = useState(false)
  const [form, setForm] = useState<FlowerForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [pricePushPrompt, setPricePushPrompt] = useState<{ flowerId: string; cost: number; count: number } | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return flowers.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.variety?.toLowerCase().includes(q) ||
      f.supplier?.toLowerCase().includes(q) ||
      f.color_name?.toLowerCase().includes(q)
    )
  }, [flowers, search])

  const openEdit = (f: Flower) => {
    setForm({
      name: f.name, variety: f.variety ?? '', color_name: f.color_name ?? '',
      color_hex: f.color_hex ?? '', unit: f.unit, stems_per_bunch: String(f.stems_per_bunch),
      wholesale_cost_per_stem: String(f.wholesale_cost_per_stem),
      wholesale_cost_per_bunch: String((f.wholesale_cost_per_stem * f.stems_per_bunch).toFixed(2)),
      supplier: f.supplier ?? '', notes: f.notes ?? '',
      seasonal_months: f.seasonal_months ?? [],
    })
    setEditingId(f.id)
  }

  const handleSave = async () => {
    setLoading(true)
    const payload = {
      name: form.name, variety: form.variety || null,
      color_name: form.color_name || null, color_hex: form.color_hex || null,
      unit: form.unit as Flower['unit'],
      stems_per_bunch: parseInt(form.stems_per_bunch) || 10,
      wholesale_cost_per_stem: parseFloat(form.wholesale_cost_per_stem) || 0,
      supplier: form.supplier || null, notes: form.notes || null,
      seasonal_months: form.seasonal_months,
    }

    if (editingId) {
      const newCost = parseFloat(form.wholesale_cost_per_stem) || 0
      const existing = flowers.find(f => f.id === editingId)

      if (existing && existing.wholesale_cost_per_stem !== newCost) {
        const { draftRecipeCount } = await updateFlowerPrice(editingId, newCost)
        await updateFlower(editingId, { ...payload, wholesale_cost_per_stem: newCost })
        if (draftRecipeCount > 0) {
          setPricePushPrompt({ flowerId: editingId, cost: newCost, count: draftRecipeCount })
        }
      } else {
        await updateFlower(editingId, payload)
      }
      onUpdate(flowers.map(f => f.id === editingId ? { ...f, ...payload } : f))
      setEditingId(null)
    } else {
      const { data, error } = await createFlower(payload)
      if (!error && data) onUpdate([...flowers, data])
      setShowAdd(false)
    }

    setForm(emptyForm)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    await deleteFlower(id)
    onUpdate(flowers.filter(f => f.id !== id))
  }

  const handleSeedAll = async () => {
    setLoading(true)
    const result = await seedFromMasterLibrary(
      masterFlowerLibrary.map(e => ({
        name: e.name, variety: e.variety, color_name: e.color_name, color_hex: e.color_hex,
        unit: e.unit, stems_per_bunch: e.stems_per_bunch,
        wholesale_cost_per_stem: e.wholesale_cost_per_stem,
        seasonal_months: e.seasonal_months, notes: e.notes,
      }))
    )
    if (!result.error) {
      // Refresh the list
      window.location.reload()
    }
    setLoading(false)
    setShowSeed(false)
  }

  const toggleMonth = (m: number) => {
    setForm(f => ({
      ...f,
      seasonal_months: f.seasonal_months.includes(m)
        ? f.seasonal_months.filter(x => x !== m)
        : [...f.seasonal_months, m].sort((a, b) => a - b)
    }))
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89880]" />
          <Input
            placeholder="Search flowers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSeed(true)}>
          <Upload className="w-4 h-4 mr-1.5" /> Import Library
        </Button>
        <Button size="sm" onClick={() => { setForm(emptyForm); setShowAdd(true) }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Flower
        </Button>
      </div>

      {/* Price push prompt */}
      {pricePushPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl px-4 py-3 text-sm"
        >
          <AlertCircle className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
          <span>
            Push new price to <strong>{pricePushPrompt.count} draft recipe{pricePushPrompt.count > 1 ? 's' : ''}</strong>?
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={async () => {
              await pushPriceToRecipes(pricePushPrompt.flowerId, pricePushPrompt.cost)
              setPricePushPrompt(null)
            }}
          >
            Update {pricePushPrompt.count} recipe{pricePushPrompt.count > 1 ? 's' : ''}
          </Button>
          <button
            onClick={() => setPricePushPrompt(null)}
            className="text-[#A89880] hover:text-[#4A3F35] text-xs"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8] bg-[#F5F1EC]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Flower</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Variety</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Color</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Unit</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Cost/Stem</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Stems/Bunch</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Bunch Cost</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Supplier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Season</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((flower, i) => (
                <motion.tr
                  key={flower.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#FAF7F2] group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {flower.image_url ? (
                        <img src={flower.image_url} alt={flower.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <ColorSwatch hex={flower.color_hex} size="sm" />
                      )}
                      <span className="font-medium text-sm text-[#4A3F35]">{flower.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#A89880]">{flower.variety || '—'}</td>
                  <td className="px-4 py-3">
                    {flower.color_name ? (
                      <div className="flex items-center gap-1.5">
                        <ColorSwatch hex={flower.color_hex} size="xs" />
                        <span className="text-sm text-[#4A3F35]">{flower.color_name}</span>
                      </div>
                    ) : <span className="text-sm text-[#A89880]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{flower.unit}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm font-medium text-[#4A3F35]">
                      ${Number(flower.wholesale_cost_per_stem).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm text-[#4A3F35]">{flower.stems_per_bunch}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm text-[#4A3F35]">
                      ${(Number(flower.wholesale_cost_per_stem) * flower.stems_per_bunch).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#A89880]">{flower.supplier || '—'}</td>
                  <td className="px-4 py-3">
                    {flower.seasonal_months?.length === 0 ? (
                      <Badge variant="default" className="text-xs">Year-round</Badge>
                    ) : (
                      <span className="text-xs text-[#A89880]">
                        {flower.seasonal_months?.map(m => MONTH_NAMES[m - 1]).join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(flower)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(flower.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-[#C0392B]" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">🌸</p>
            <p className="text-sm font-medium text-[#4A3F35]">No flowers yet</p>
            <p className="text-sm text-[#A89880] mt-1">Add flowers manually or import from the master library</p>
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showAdd || editingId !== null} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditingId(null); setForm(emptyForm) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit flower' : 'Add flower'}</DialogTitle>
          </DialogHeader>
          <FlowerFormFields form={form} onChange={setForm} toggleMonth={toggleMonth} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !form.name.trim()}>
              {loading ? 'Saving…' : editingId ? 'Save changes' : 'Add flower'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seed library dialog */}
      <Dialog open={showSeed} onOpenChange={setShowSeed}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import master flower library</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#A89880]">
            Import {masterFlowerLibrary.length} pre-configured flowers from our master library.
            All prices are typical mid-market defaults — you can edit them anytime.
          </p>
          <p className="text-sm text-[#A89880]">
            This will add all flowers to your catalog. Existing flowers won't be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeed(false)}>Cancel</Button>
            <Button onClick={handleSeedAll} disabled={loading}>
              {loading ? 'Importing…' : `Import all ${masterFlowerLibrary.length} flowers`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Flower Form Fields ───────────────────────────────────

function FlowerFormFields({
  form,
  onChange,
  toggleMonth,
}: {
  form: FlowerForm
  onChange: (f: FlowerForm) => void
  toggleMonth: (m: number) => void
}) {
  const set = (key: keyof FlowerForm, value: string | number[]) =>
    onChange({ ...form, [key]: value })

  const setStemsPerBunch = (value: string) => {
    const stems = parseFloat(value) || 1
    const stemCost = parseFloat(form.wholesale_cost_per_stem) || 0
    onChange({ ...form, stems_per_bunch: value, wholesale_cost_per_bunch: (stemCost * stems).toFixed(2) })
  }

  const setCostPerStem = (value: string) => {
    const stemCost = parseFloat(value) || 0
    const stems = parseFloat(form.stems_per_bunch) || 1
    onChange({ ...form, wholesale_cost_per_stem: value, wholesale_cost_per_bunch: (stemCost * stems).toFixed(2) })
  }

  const setCostPerBunch = (value: string) => {
    const bunchCost = parseFloat(value) || 0
    const stems = parseFloat(form.stems_per_bunch) || 1
    onChange({ ...form, wholesale_cost_per_bunch: value, wholesale_cost_per_stem: (bunchCost / stems).toFixed(4).replace(/\.?0+$/, '') })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input placeholder="Rose" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Variety</Label>
        <Input placeholder="Garden" value={form.variety} onChange={e => set('variety', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Color name</Label>
        <Input placeholder="Blush" value={form.color_name} onChange={e => set('color_name', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Color</Label>
        <div className="flex items-center gap-2">
          <div className="relative">
            <ColorSwatch hex={form.color_hex} size="md" className="cursor-pointer" />
          </div>
          <Input
            placeholder="#E8A598"
            value={form.color_hex}
            onChange={e => set('color_hex', e.target.value)}
            className="flex-1 font-mono text-sm"
          />
        </div>
        <div className="grid grid-cols-7 gap-1 mt-1">
          {BOTANICAL_COLORS.map(c => (
            <button
              key={c.hex}
              onClick={() => onChange({ ...form, color_hex: c.hex, color_name: form.color_name || c.name })}
              className="w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform"
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Unit</Label>
        <Select value={form.unit} onValueChange={v => set('unit', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="stem">Stem</SelectItem>
            <SelectItem value="bunch">Bunch</SelectItem>
            <SelectItem value="box">Box</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Stems per bunch</Label>
        <Input type="number" min="1" value={form.stems_per_bunch} onChange={e => setStemsPerBunch(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Wholesale cost/stem ($)</Label>
        <Input type="number" step="0.01" min="0" value={form.wholesale_cost_per_stem} onChange={e => setCostPerStem(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Wholesale cost/bunch ($)</Label>
        <Input type="number" step="0.01" min="0" value={form.wholesale_cost_per_bunch} onChange={e => setCostPerBunch(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Supplier</Label>
        <Input placeholder="Dutch Flower Auctions" value={form.supplier} onChange={e => set('supplier', e.target.value)} />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Seasonal availability (leave empty for year-round)</Label>
        <div className="flex flex-wrap gap-1.5">
          {MONTH_NAMES.map((name, i) => {
            const m = i + 1
            const selected = form.seasonal_months.includes(m)
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMonth(m)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-[#2D5016] text-white'
                    : 'bg-[#F5F1EC] text-[#A89880] hover:bg-[#E8E0D8]'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
