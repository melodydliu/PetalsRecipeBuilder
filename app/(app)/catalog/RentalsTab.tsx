'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createRental, updateRental, deleteRental } from './actions'
import type { Rental } from '@/types/database'

interface RentalsTabProps {
  rentals: Rental[]
  onUpdate: (items: Rental[]) => void
}

interface RentalForm {
  name: string; acquisition_cost: string; times_used: string; notes: string
}

const emptyForm: RentalForm = { name: '', acquisition_cost: '0', times_used: '1', notes: '' }

export function RentalsTab({ rentals, onUpdate }: RentalsTabProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<RentalForm>(emptyForm)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rentals.filter(r => r.name.toLowerCase().includes(q))
  }, [rentals, search])

  const openEdit = (r: Rental) => {
    setForm({
      name: r.name,
      acquisition_cost: String(r.acquisition_cost),
      times_used: String(r.times_used),
      notes: r.notes ?? '',
    })
    setEditingId(r.id)
  }

  const handleSave = async () => {
    setLoading(true)
    const payload = {
      name: form.name,
      acquisition_cost: parseFloat(form.acquisition_cost) || 0,
      times_used: parseInt(form.times_used) || 1,
      notes: form.notes || null,
    }

    if (editingId) {
      await updateRental(editingId, payload)
      onUpdate(rentals.map(r => r.id === editingId ? { ...r, ...payload } : r))
      setEditingId(null)
    } else {
      const { data } = await createRental(payload)
      if (data) onUpdate([...rentals, data])
      setShowAdd(false)
    }
    setForm(emptyForm)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    await deleteRental(id)
    onUpdate(rentals.filter(r => r.id !== id))
  }

  const set = (key: keyof RentalForm, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89880]" />
          <Input placeholder="Search rentals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => { setForm(emptyForm); setShowAdd(true) }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Rental
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8] bg-[#F5F1EC]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Item</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Acquisition Cost</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Uses</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Cost/Use</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((r, i) => {
                const costPerUse = r.times_used > 0 ? r.acquisition_cost / r.times_used : r.acquisition_cost
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#FAF7F2] group">
                    <td className="px-4 py-3 font-medium text-sm text-[#4A3F35]">{r.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-[#4A3F35]">
                      ${Number(r.acquisition_cost).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[#A89880]">{r.times_used}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-medium text-[#2D5016]">
                      ${costPerUse.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(r)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-[#C0392B]" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">🏺</p>
            <p className="text-sm font-medium text-[#4A3F35]">No rentals yet</p>
            <p className="text-sm text-[#A89880] mt-1">Track vases, arches, candelabras, and other rental items</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd || editingId !== null} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditingId(null); setForm(emptyForm) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit rental item' : 'Add rental item'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Large Copper Arch" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Acquisition cost ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.acquisition_cost} onChange={e => set('acquisition_cost', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Times used</Label>
                <Input type="number" min="1" value={form.times_used} onChange={e => set('times_used', e.target.value)} />
              </div>
            </div>
            {form.acquisition_cost && form.times_used && (
              <p className="text-sm text-[#2D5016] font-medium">
                Amortized cost per use: ${(parseFloat(form.acquisition_cost) / parseInt(form.times_used)).toFixed(2)}
              </p>
            )}
            <div className="space-y-1.5">
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
