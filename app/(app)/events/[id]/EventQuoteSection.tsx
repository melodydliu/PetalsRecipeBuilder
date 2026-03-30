'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, X, ExternalLink, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatCurrency } from '@/lib/pricing/engine'
import { addQuoteItem, updateQuoteItem, removeQuoteItem } from '../actions'
import type { Database } from '@/types/database'
import Link from 'next/link'

export type QuoteItemWithRecipe = Database['public']['Tables']['event_quote_items']['Row'] & {
  recipes: { id: string; name: string } | null
}

const SERVICE_FEES_CAT = 'Service Fees'
const PRESET_CATEGORIES = ['Personals', 'Ceremony', 'Cocktail Hour', 'Reception', SERVICE_FEES_CAT]

const PRESET_ITEMS: Record<string, string[]> = {
  Personals: ['Bridal Bouquet', 'Bridesmaids Bouquet', 'Toss Bouquet', 'Groom Boutonniere', 'Groomsmen Boutonniere', 'Flower Girl Crown', 'Flower Girl Basket', 'Corsage', 'Wrist Corsage'],
  Ceremony: ['Arch Florals', 'Ceremony Backdrop', 'Aisle Arrangements', 'Aisle Petals', 'Altar Arrangement', 'Pew Markers', 'Welcome Arrangement'],
  'Cocktail Hour': ['Cocktail Hour Bud Vases', 'Welcome Table Florals', 'Bar Florals', 'Lounge Arrangements'],
  Reception: ['Reception Table Centerpieces', 'Sweetheart Table', 'Cake Flowers', 'Hurricane Candle Trios', 'Hanging Installation', 'Bud Vase Clusters'],
  'Service Fees': ['Delivery & Setup', 'Cleanup', 'Breakdown Fee', 'Travel Fee'],
}

const CATEGORY_PILL_STYLES: Record<string, string> = {
  'Personals':     'bg-pink-50 text-pink-700 border-pink-200',
  'Ceremony':      'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Cocktail Hour': 'bg-amber-50 text-amber-700 border-amber-200',
  'Reception':     'bg-violet-50 text-violet-700 border-violet-200',
  'Service Fees':  'bg-slate-50 text-slate-500 border-slate-200',
}
const DEFAULT_PILL_STYLE = 'bg-[#F5F1EC] text-[#4A3F35] border-[#E8E0D8]'

// Shared grid — must match the header
const ITEM_ROW = 'grid grid-cols-[minmax(0,1fr)_140px_56px_100px_100px_48px] gap-x-4 items-start'

interface Props {
  initialItems: QuoteItemWithRecipe[]
  eventId: string
  canEdit: boolean
}

type EditDraft = {
  itemName: string
  quantity: string
  unitPrice: string
  feeType: 'flat' | 'percentage' | null
  notes: string
}

type AddFormState = {
  category: string
  itemName: string
  quantity: string
  unitPrice: string
  feeType: 'flat' | 'percentage'
  notes: string
  loading: boolean
}

const BLANK_FORM: AddFormState = { category: '', itemName: '', quantity: '1', unitPrice: '', feeType: 'flat', notes: '', loading: false }

export function EventQuoteSection({ initialItems, eventId, canEdit }: Props) {
  const [items, setItems] = useState<QuoteItemWithRecipe[]>(initialItems)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddFormState>(BLANK_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>({ itemName: '', quantity: '', unitPrice: '', feeType: null, notes: '' })
  const [editLoading, setEditLoading] = useState(false)

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items]
  )

  // All categories available for the pill selector
  const existingCategories = useMemo(() => {
    const seen = new Set<string>()
    for (const item of sortedItems) seen.add(item.category)
    return [...seen]
  }, [sortedItems])

  const allCategories = useMemo(() => [
    ...existingCategories,
    ...PRESET_CATEGORIES.filter(c => !existingCategories.includes(c)),
  ], [existingCategories])

  const itemsSubtotal = useMemo(
    () => items.filter(i => i.category !== SERVICE_FEES_CAT)
               .reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0),
    [items]
  )

  function nextSort() {
    return items.length === 0 ? 0 : Math.max(...items.map(i => i.sort_order)) + 1
  }

  function openAddModal(category: string) {
    setAddForm({ ...BLANK_FORM, category })
    setAddModalOpen(true)
  }

  function closeAddModal() {
    setAddModalOpen(false)
    setAddForm(BLANK_FORM)
  }

  async function handleAddItem() {
    if (!addForm.category || !addForm.itemName.trim()) return
    const isServiceFee = addForm.category === SERVICE_FEES_CAT
    setAddForm(f => ({ ...f, loading: true }))
    const { data, error } = await addQuoteItem(eventId, {
      category: addForm.category,
      item_name: addForm.itemName.trim(),
      quantity: isServiceFee ? 1 : (parseFloat(addForm.quantity) || 1),
      unit_price: parseFloat(addForm.unitPrice) || 0,
      fee_type: isServiceFee ? addForm.feeType : null,
      notes: addForm.notes.trim() || null,
      sort_order: nextSort(),
      recipe_id: null,
    })
    if (!error && data) {
      setItems(prev => [...prev, { ...data, recipes: null } as QuoteItemWithRecipe])
      closeAddModal()
    } else {
      setAddForm(f => ({ ...f, loading: false }))
    }
  }

  function startEdit(item: QuoteItemWithRecipe) {
    setEditId(item.id)
    setEditDraft({ itemName: item.item_name, quantity: String(item.quantity), unitPrice: String(item.unit_price), feeType: item.fee_type, notes: item.notes ?? '' })
  }

  function cancelEdit() { setEditId(null) }

  async function saveEdit() {
    if (!editId) return
    setEditLoading(true)
    const updates = {
      item_name: editDraft.itemName.trim() || 'Untitled',
      quantity: parseFloat(editDraft.quantity) || 1,
      unit_price: parseFloat(editDraft.unitPrice) || 0,
      fee_type: editDraft.feeType,
      notes: editDraft.notes.trim() || null,
    }
    const { error } = await updateQuoteItem(editId, eventId, updates)
    if (!error) {
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...updates } : i))
      setEditId(null)
    }
    setEditLoading(false)
  }

  async function handleDeleteItem(id: string) {
    if (editId === id) setEditId(null)
    setItems(prev => prev.filter(i => i.id !== id))
    await removeQuoteItem(id, eventId)
  }

  async function handleCategoryChange(itemId: string, newCategory: string) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, category: newCategory } : i))
    await updateQuoteItem(itemId, eventId, { category: newCategory })
  }

  const editingItem = editId ? items.find(i => i.id === editId) : null

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#4A3F35]">Client Proposal</h2>
          <p className="text-xs text-[#A89880] mt-0.5">Build your quote before creating recipes</p>
        </div>
        {canEdit && items.length > 0 && (
          <Button size="sm" onClick={() => openAddModal(PRESET_CATEGORIES[0])}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Item
          </Button>
        )}
      </div>

      {/* ── Add Item Modal ───────────────────────────────────── */}
      <Dialog open={addModalOpen} onOpenChange={open => { if (!open) closeAddModal() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#2D5016]">New Line Item</DialogTitle>
          </DialogHeader>
          <AddItemModalBody
            form={addForm}
            allCategories={allCategories}
            onChange={updates => setAddForm(f => ({ ...f, ...updates }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeAddModal} disabled={addForm.loading}>Cancel</Button>
            <Button
              onClick={handleAddItem}
              disabled={!addForm.itemName.trim() || !addForm.category || addForm.loading}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90 text-white"
            >
              {addForm.loading ? 'Adding…' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Item Modal ──────────────────────────────────── */}
      <Dialog open={editId !== null} onOpenChange={open => { if (!open) cancelEdit() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#2D5016]">Edit Item</DialogTitle>
          </DialogHeader>
          <EditItemModalBody
            draft={editDraft}
            isServiceFee={editingItem?.category === SERVICE_FEES_CAT}
            onChange={d => setEditDraft(p => ({ ...p, ...d }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={cancelEdit} disabled={editLoading}>Cancel</Button>
            <Button
              onClick={saveEdit}
              disabled={editLoading}
              className="bg-[#2D5016] hover:bg-[#2D5016]/90 text-white"
            >
              {editLoading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Unified table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">

        {/* Column headers */}
        <div className="grid grid-cols-[minmax(0,1fr)_140px_56px_100px_100px_48px] gap-x-4 px-5 py-2.5 border-b border-[#E8E0D8]">
          <span className="text-[11px] font-medium text-[#A89880] uppercase tracking-wider">Item</span>
          <span className="text-[11px] font-medium text-[#A89880] uppercase tracking-wider">Category</span>
          <span className="text-[11px] font-medium text-[#A89880] uppercase tracking-wider text-right">Qty</span>
          <span className="text-[11px] font-medium text-[#A89880] uppercase tracking-wider text-right">Unit Price</span>
          <span className="text-[11px] font-medium text-[#A89880] uppercase tracking-wider text-right">Total</span>
          <span />
        </div>

        {/* Empty state */}
        {sortedItems.length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3">
            <p className="text-sm text-[#A89880]">No items yet — add your first proposal line item.</p>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => openAddModal(PRESET_CATEGORIES[0])}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Item
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#F5F1EC]">
            {sortedItems.map(item => (
              <ItemDisplayRow
                key={item.id}
                item={item}
                isServiceFee={item.category === SERVICE_FEES_CAT}
                itemsSubtotal={itemsSubtotal}
                canEdit={canEdit}
                allCategories={allCategories}
                eventId={eventId}
                onEdit={() => startEdit(item)}
                onDelete={() => handleDeleteItem(item.id)}
                onCategoryChange={cat => handleCategoryChange(item.id, cat)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Category pill ──────────────────────────────────────────────────────────

function CategoryPill({ category, allCategories, onChange }: {
  category: string
  allCategories: string[]
  onChange: (cat: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const pillStyle = CATEGORY_PILL_STYLES[category] ?? DEFAULT_PILL_STYLE

  function select(cat: string) {
    onChange(cat)
    setOpen(false)
    setCustom('')
  }

  function commitCustom() {
    const trimmed = custom.trim()
    if (trimmed) select(trimmed)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-75 ${pillStyle}`}
        >
          {category}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5" align="start">
        {/* Preset + existing categories */}
        <div className="space-y-0.5 mb-1.5">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => select(cat)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-[#F5F1EC] flex items-center gap-2 ${cat === category ? 'font-medium' : ''}`}
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_PILL_STYLES[cat] ?? DEFAULT_PILL_STYLE}`}>
                {cat}
              </span>
              {cat === category && <span className="ml-auto text-[#2D5016] text-xs">✓</span>}
            </button>
          ))}
        </div>

        {/* Custom category input */}
        <div className="border-t border-[#F0EDE8] pt-1.5">
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitCustom() }}
            placeholder="Custom category…"
            className="w-full px-2 py-1.5 text-xs rounded-md border border-[#E8E0D8] outline-none focus:ring-1 focus:ring-[#2D5016] focus:border-[#2D5016] placeholder:text-[#C8BEB4]"
          />
          {custom.trim() && (
            <button
              onClick={commitCustom}
              className="mt-1 w-full text-left px-2 py-1 text-xs text-[#2D5016] font-medium hover:bg-[#F5F1EC] rounded-md transition-colors"
            >
              + Create &ldquo;{custom.trim()}&rdquo;
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Modal body components ──────────────────────────────────────────────────

function AddItemModalBody({
  form,
  allCategories,
  onChange,
}: {
  form: AddFormState
  allCategories: string[]
  onChange: (updates: Partial<AddFormState>) => void
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const isServiceFee = form.category === SERVICE_FEES_CAT
  const presets = PRESET_ITEMS[form.category] ?? []
  const filtered = form.itemName
    ? presets.filter(p => p.toLowerCase().includes(form.itemName.toLowerCase()))
    : presets

  return (
    <div className="space-y-4 py-1">
      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-xs text-[#A89880] uppercase tracking-wider">Category</Label>
        <Select value={form.category} onValueChange={v => onChange({ category: v, itemName: '', unitPrice: '' })}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a category…" />
          </SelectTrigger>
          <SelectContent>
            {allCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Item name with suggestions */}
      <div className="space-y-1.5">
        <Label className="text-xs text-[#A89880] uppercase tracking-wider">Item Name</Label>
        <div className="relative">
          <input
            autoFocus
            value={form.itemName}
            onChange={e => { onChange({ itemName: e.target.value }); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="e.g. Bridal Bouquet"
            className="w-full h-9 rounded-md border border-[#E8E0D8] px-3 text-sm text-[#4A3F35] placeholder:text-[#C8BEB4] outline-none focus:ring-1 focus:ring-[#2D5016] focus:border-[#2D5016]"
          />
          {showSuggestions && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8E0D8] rounded-lg shadow-lg z-30 max-h-44 overflow-y-auto">
              {filtered.map(preset => (
                <button key={preset}
                  onMouseDown={() => { onChange({ itemName: preset }); setShowSuggestions(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-[#4A3F35] hover:bg-[#F5F1EC] transition-colors">
                  {preset}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Qty + Price or Fee type + Amount */}
      {isServiceFee ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#A89880] uppercase tracking-wider">Fee Type</Label>
            <div className="flex rounded-md border border-[#E8E0D8] overflow-hidden h-9 text-sm">
              {(['flat', 'percentage'] as const).map(t => (
                <button key={t} type="button" onClick={() => onChange({ feeType: t })}
                  className={`flex-1 font-medium transition-colors ${form.feeType === t ? 'bg-[#2D5016] text-white' : 'bg-white text-[#4A3F35] hover:bg-[#F5F1EC]'}`}>
                  {t === 'flat' ? '$ Flat' : '% Rate'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#A89880] uppercase tracking-wider">Amount</Label>
            <div className="flex items-center border border-[#E8E0D8] rounded-md overflow-hidden h-9 bg-white">
              <span className="px-2.5 text-sm text-[#A89880]">{form.feeType === 'percentage' ? '%' : '$'}</span>
              <input type="number" min="0" step={form.feeType === 'percentage' ? '0.1' : '1'}
                value={form.unitPrice} onChange={e => onChange({ unitPrice: e.target.value })}
                placeholder="0"
                className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-3 min-w-0" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#A89880] uppercase tracking-wider">Quantity</Label>
            <input type="number" min="1" step="1" value={form.quantity}
              onChange={e => onChange({ quantity: e.target.value })}
              className="w-full h-9 rounded-md border border-[#E8E0D8] px-3 text-sm text-[#4A3F35] outline-none focus:ring-1 focus:ring-[#2D5016] focus:border-[#2D5016]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#A89880] uppercase tracking-wider">Unit Price</Label>
            <div className="flex items-center border border-[#E8E0D8] rounded-md overflow-hidden h-9 bg-white">
              <span className="px-2.5 text-sm text-[#A89880]">$</span>
              <input type="number" min="0" step="1" value={form.unitPrice}
                onChange={e => onChange({ unitPrice: e.target.value })}
                placeholder="0"
                className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-3 min-w-0" />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-[#A89880] uppercase tracking-wider">Notes <span className="normal-case font-normal">(optional)</span></Label>
        <input value={form.notes} onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any details for the client…"
          className="w-full h-9 rounded-md border border-[#E8E0D8] px-3 text-sm text-[#4A3F35] placeholder:text-[#C8BEB4] outline-none focus:ring-1 focus:ring-[#2D5016] focus:border-[#2D5016]" />
      </div>
    </div>
  )
}

function EditItemModalBody({
  draft,
  isServiceFee,
  onChange,
}: {
  draft: EditDraft
  isServiceFee: boolean | undefined
  onChange: (d: Partial<EditDraft>) => void
}) {
  return (
    <div className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label className="text-xs text-[#A89880] uppercase tracking-wider">Item Name</Label>
        <input
          autoFocus
          value={draft.itemName}
          onChange={e => onChange({ itemName: e.target.value })}
          className="w-full h-9 rounded-md border border-[#E8E0D8] px-3 text-sm text-[#4A3F35] outline-none focus:ring-1 focus:ring-[#2D5016] focus:border-[#2D5016]"
        />
      </div>

      {isServiceFee ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#A89880] uppercase tracking-wider">Fee Type</Label>
            <div className="flex rounded-md border border-[#E8E0D8] overflow-hidden h-9 text-sm">
              {(['flat', 'percentage'] as const).map(t => (
                <button key={t} type="button" onClick={() => onChange({ feeType: t })}
                  className={`flex-1 font-medium transition-colors ${draft.feeType === t ? 'bg-[#2D5016] text-white' : 'bg-white text-[#4A3F35] hover:bg-[#F5F1EC]'}`}>
                  {t === 'flat' ? '$ Flat' : '% Rate'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#A89880] uppercase tracking-wider">Amount</Label>
            <div className="flex items-center border border-[#E8E0D8] rounded-md overflow-hidden h-9 bg-white">
              <span className="px-2.5 text-sm text-[#A89880]">{draft.feeType === 'percentage' ? '%' : '$'}</span>
              <input type="number" min="0" step="0.01" value={draft.unitPrice}
                onChange={e => onChange({ unitPrice: e.target.value })}
                className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-3 min-w-0" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#A89880] uppercase tracking-wider">Quantity</Label>
            <input type="number" min="1" step="1" value={draft.quantity}
              onChange={e => onChange({ quantity: e.target.value })}
              className="w-full h-9 rounded-md border border-[#E8E0D8] px-3 text-sm text-[#4A3F35] outline-none focus:ring-1 focus:ring-[#2D5016] focus:border-[#2D5016]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#A89880] uppercase tracking-wider">Unit Price</Label>
            <div className="flex items-center border border-[#E8E0D8] rounded-md overflow-hidden h-9 bg-white">
              <span className="px-2.5 text-sm text-[#A89880]">$</span>
              <input type="number" min="0" step="1" value={draft.unitPrice}
                onChange={e => onChange({ unitPrice: e.target.value })}
                className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-3 min-w-0" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-[#A89880] uppercase tracking-wider">Notes <span className="normal-case font-normal">(optional)</span></Label>
        <input value={draft.notes} onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any details for the client…"
          className="w-full h-9 rounded-md border border-[#E8E0D8] px-3 text-sm text-[#4A3F35] placeholder:text-[#C8BEB4] outline-none focus:ring-1 focus:ring-[#2D5016] focus:border-[#2D5016]" />
      </div>
    </div>
  )
}

// ── Item display row ───────────────────────────────────────────────────────

function ItemDisplayRow({
  item, isServiceFee, itemsSubtotal, canEdit, allCategories, eventId, onEdit, onDelete, onCategoryChange,
}: {
  item: QuoteItemWithRecipe
  isServiceFee: boolean
  itemsSubtotal: number
  canEdit: boolean
  allCategories: string[]
  eventId: string
  onEdit: () => void
  onDelete: () => void
  onCategoryChange: (cat: string) => void
}) {
  const total = isServiceFee
    ? item.fee_type === 'percentage'
      ? (Number(item.unit_price) / 100) * itemsSubtotal
      : Number(item.unit_price)
    : Number(item.unit_price) * Number(item.quantity)

  const qtyDisplay = isServiceFee
    ? (item.fee_type === 'percentage' ? `${item.unit_price}%` : '—')
    : String(Number(item.quantity))

  const unitPriceDisplay = isServiceFee
    ? (item.fee_type === 'flat' ? formatCurrency(Number(item.unit_price)) : '—')
    : formatCurrency(Number(item.unit_price))

  return (
    <div className={`${ITEM_ROW} px-5 py-3 hover:bg-[#FDFCFB] transition-colors`}>
      {/* Item name + notes + recipe link */}
      <div className="min-w-0">
        <span className="text-sm font-medium text-[#4A3F35]">{item.item_name}</span>
        {item.notes && (
          <p className="text-xs text-[#A89880] mt-0.5 italic leading-snug">{item.notes}</p>
        )}
        {!isServiceFee && item.recipe_id && item.recipes && (
          <Link href={`/recipes/${item.recipe_id}?from=${eventId}`}
            className="inline-flex items-center gap-1 mt-1 text-xs text-[#2D5016] hover:underline font-medium group/link">
            {item.recipes.name}
            <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover/link:opacity-100" />
          </Link>
        )}
      </div>

      {/* Category pill */}
      <div className="pt-0.5">
        {canEdit ? (
          <CategoryPill
            category={item.category}
            allCategories={allCategories}
            onChange={onCategoryChange}
          />
        ) : (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_PILL_STYLES[item.category] ?? DEFAULT_PILL_STYLE}`}>
            {item.category}
          </span>
        )}
      </div>

      <span className="text-sm text-right text-[#4A3F35] pt-0.5">{qtyDisplay}</span>
      <span className="text-sm text-right font-mono text-[#A89880] pt-0.5">{unitPriceDisplay}</span>
      <span className="text-sm text-right font-mono font-semibold text-[#4A3F35] pt-0.5">{formatCurrency(total)}</span>

      {/* Actions */}
      <div className="flex items-start gap-1 justify-end pt-0.5">
        {canEdit && (
          <>
            <button onClick={onEdit}
              className="p-1 rounded text-[#A89880] hover:text-[#4A3F35] hover:bg-[#F5F1EC] transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onDelete}
              className="p-1 rounded text-[#A89880] hover:text-red-400 hover:bg-red-50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
