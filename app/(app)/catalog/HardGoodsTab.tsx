'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createHardGood, updateHardGood, deleteHardGood } from './actions'
import type { HardGood } from '@/types/database'

const CATEGORIES: { value: HardGood['category']; label: string }[] = [
  { value: 'container', label: 'Container' },
  { value: 'foam', label: 'Foam' },
  { value: 'ribbon', label: 'Ribbon' },
  { value: 'wire', label: 'Wire' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'other', label: 'Other' },
]

interface HardGoodsTabProps {
  hardGoods: HardGood[]
  onUpdate: (items: HardGood[]) => void
}

interface HGForm {
  name: string; category: string; unit: string
  wholesale_cost: string; supplier: string; notes: string
}

const emptyForm: HGForm = {
  name: '', category: 'container', unit: 'each',
  wholesale_cost: '0', supplier: '', notes: '',
}

export function HardGoodsTab({ hardGoods, onUpdate }: HardGoodsTabProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<HGForm>(emptyForm)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return hardGoods.filter(g =>
      g.name.toLowerCase().includes(q) || g.supplier?.toLowerCase().includes(q)
    )
  }, [hardGoods, search])

  const openEdit = (g: HardGood) => {
    setForm({
      name: g.name, category: g.category, unit: g.unit,
      wholesale_cost: String(g.wholesale_cost),
      supplier: g.supplier ?? '', notes: g.notes ?? '',
    })
    setEditingId(g.id)
  }

  const handleSave = async () => {
    setLoading(true)
    const payload = {
      name: form.name, category: form.category as HardGood['category'],
      unit: form.unit as HardGood['unit'],
      wholesale_cost: parseFloat(form.wholesale_cost) || 0,
      supplier: form.supplier || null, notes: form.notes || null,
    }

    if (editingId) {
      await updateHardGood(editingId, payload)
      onUpdate(hardGoods.map(g => g.id === editingId ? { ...g, ...payload } : g))
      setEditingId(null)
    } else {
      const { data } = await createHardGood(payload)
      if (data) onUpdate([...hardGoods, data])
      setShowAdd(false)
    }
    setForm(emptyForm)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    await deleteHardGood(id)
    onUpdate(hardGoods.filter(g => g.id !== id))
  }

  const set = (key: keyof HGForm, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89880]" />
          <Input placeholder="Search hard goods…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => { setForm(emptyForm); setShowAdd(true) }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Hard Good
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8] bg-[#F5F1EC]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Item</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Unit</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Cost</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Supplier</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((g, i) => (
                <motion.tr key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.02 }} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#FAF7F2] group">
                  <td className="px-4 py-3 font-medium text-sm text-[#4A3F35]">{g.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs capitalize">{g.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#A89880]">{g.unit}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-[#4A3F35]">${Number(g.wholesale_cost).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-[#A89880]">{g.supplier || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(g)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(g.id)}>
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
            <p className="text-2xl mb-2">📦</p>
            <p className="text-sm font-medium text-[#4A3F35]">No hard goods yet</p>
            <p className="text-sm text-[#A89880] mt-1">Add containers, foam, ribbon, and other supplies</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd || editingId !== null} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditingId(null); setForm(emptyForm) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit hard good' : 'Add hard good'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Mercury Vase" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={v => set('unit', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="each">Each</SelectItem>
                  <SelectItem value="yard">Yard</SelectItem>
                  <SelectItem value="foot">Foot</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Wholesale cost ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.wholesale_cost} onChange={e => set('wholesale_cost', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={e => set('supplier', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !form.name.trim()}>
              {loading ? 'Saving…' : editingId ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
