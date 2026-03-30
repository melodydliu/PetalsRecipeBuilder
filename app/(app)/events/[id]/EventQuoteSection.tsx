'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Check, X, ExternalLink, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/pricing/engine'
import { addQuoteItem, updateQuoteItem, removeQuoteItem, createRecipeFromQuoteItem } from '../actions'
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

// Tailwind grid templates — defined as constants so they're statically analyzable
const ITEM_ROW = 'grid grid-cols-[minmax(0,1fr)_48px_88px_88px_56px] gap-x-4 items-start'
const ITEM_HDR = 'grid grid-cols-[minmax(0,1fr)_48px_88px_88px_56px] gap-x-4'
const SVC_ROW  = 'grid grid-cols-[minmax(0,1fr)_80px_96px_56px] gap-x-4 items-center'
const SVC_HDR  = 'grid grid-cols-[minmax(0,1fr)_80px_96px_56px] gap-x-4'

interface Props {
  initialItems: QuoteItemWithRecipe[]
  eventId: string
  taxRate: number
  marginTarget: number
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
  itemName: string
  quantity: string
  unitPrice: string
  feeType: 'flat' | 'percentage'
  notes: string
  loading: boolean
}

const BLANK_FORM: AddFormState = { itemName: '', quantity: '1', unitPrice: '', feeType: 'flat', notes: '', loading: false }

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'personals', label: 'Personals' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'reception', label: 'Reception' },
  { value: 'hard-goods', label: 'Hard Goods' },
  { value: 'service-fees', label: 'Service Fees' },
]

const TAB_TO_CATEGORY: Record<string, string> = {
  personals: 'Personals',
  ceremony: 'Ceremony',
  cocktail: 'Cocktail Hour',
  reception: 'Reception',
  'hard-goods': 'Hard Goods',
  'service-fees': 'Service Fees',
}

export function EventQuoteSection({ initialItems, eventId, taxRate, marginTarget, canEdit }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<QuoteItemWithRecipe[]>(initialItems)
  const [pendingCats, setPendingCats] = useState<string[]>([])
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [customCatName, setCustomCatName] = useState('')
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addForm, setAddForm] = useState<AddFormState>(BLANK_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>({ itemName: '', quantity: '', unitPrice: '', feeType: null, notes: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [buildingId, setBuildingId] = useState<string | null>(null)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const addCatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addCatOpen) return
    const handler = (e: MouseEvent) => {
      if (addCatRef.current && !addCatRef.current.contains(e.target as Node)) setAddCatOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addCatOpen])

  const orderedCategories = useMemo(() => {
    const order: string[] = []
    const seen = new Set<string>()
    for (const item of [...items].sort((a, b) => a.sort_order - b.sort_order)) {
      if (!seen.has(item.category)) { seen.add(item.category); order.push(item.category) }
    }
    for (const cat of pendingCats) {
      if (!seen.has(cat)) { seen.add(cat); order.push(cat) }
    }
    // Service Fees always last
    const idx = order.indexOf(SERVICE_FEES_CAT)
    if (idx > -1) { order.splice(idx, 1); order.push(SERVICE_FEES_CAT) }
    return order
  }, [items, pendingCats])

  const groupedItems = useMemo(() => {
    const map = new Map<string, QuoteItemWithRecipe[]>()
    for (const item of [...items].sort((a, b) => a.sort_order - b.sort_order)) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return map
  }, [items])

  const summary = useMemo(() => {
    const nonSvc = items.filter(i => i.category !== SERVICE_FEES_CAT)
    const svcItems = items.filter(i => i.category === SERVICE_FEES_CAT)
    const itemsSubtotal = nonSvc.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0)
    const catSubtotals = new Map<string, number>()
    for (const [cat, catItems] of groupedItems) {
      if (cat !== SERVICE_FEES_CAT) {
        catSubtotals.set(cat, catItems.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0))
      }
    }
    const svcFeesTotal = svcItems.reduce((s, i) => {
      if (i.fee_type === 'percentage') return s + (Number(i.unit_price) / 100) * itemsSubtotal
      return s + Number(i.unit_price)
    }, 0)
    const preTaxTotal = itemsSubtotal + svcFeesTotal
    const taxAmount = preTaxTotal * (taxRate / 100)
    const grandTotal = preTaxTotal + taxAmount
    const targetExpense = grandTotal * (1 - marginTarget / 100)
    const targetProfit = grandTotal - targetExpense
    return { itemsSubtotal, catSubtotals, svcFeesTotal, preTaxTotal, taxAmount, grandTotal, targetExpense, targetProfit }
  }, [items, groupedItems, taxRate, marginTarget])

  function nextSort() {
    return items.length === 0 ? 0 : Math.max(...items.map(i => i.sort_order)) + 1
  }

  function openAdd(category: string) {
    setAddingTo(category)
    setAddForm({ ...BLANK_FORM, feeType: 'flat' })
    setEditId(null)
  }

  function closeAdd() {
    setAddingTo(null)
    setAddForm(BLANK_FORM)
  }

  async function handleAddItem() {
    if (!addingTo || !addForm.itemName.trim()) return
    const isServiceFee = addingTo === SERVICE_FEES_CAT
    setAddForm(f => ({ ...f, loading: true }))
    const { data, error } = await addQuoteItem(eventId, {
      category: addingTo,
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
      setPendingCats(prev => prev.filter(c => c !== addingTo))
      closeAdd()
    } else {
      setAddForm(f => ({ ...f, loading: false }))
    }
  }

  function startEdit(item: QuoteItemWithRecipe) {
    setEditId(item.id)
    setEditDraft({ itemName: item.item_name, quantity: String(item.quantity), unitPrice: String(item.unit_price), feeType: item.fee_type, notes: item.notes ?? '' })
    setAddingTo(null)
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

  async function handleDeleteCategory(category: string) {
    const catItems = groupedItems.get(category) ?? []
    setItems(prev => prev.filter(i => i.category !== category))
    setPendingCats(prev => prev.filter(c => c !== category))
    setConfirmDeleteCat(null)
    if (addingTo === category) closeAdd()
    for (const item of catItems) await removeQuoteItem(item.id, eventId)
  }

  function handleAddCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed || orderedCategories.includes(trimmed)) return
    setPendingCats(prev => [...prev, trimmed])
    setAddCatOpen(false)
    setCustomCatName('')
  }

  async function handleBuildRecipe(item: QuoteItemWithRecipe) {
    setBuildingId(item.id)
    const { data: recipe, error } = await createRecipeFromQuoteItem(item.id, eventId, item.item_name, Number(item.unit_price), Number(item.quantity))
    if (!error && recipe) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, recipe_id: recipe.id, recipes: { id: recipe.id, name: recipe.name } } : i))
      router.push(`/recipes/${recipe.id}?from=${eventId}`)
    }
    setBuildingId(null)
  }

  const availablePresets = PRESET_CATEGORIES.filter(c => !orderedCategories.includes(c))

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="mb-4">
        <h2 className="font-serif text-xl font-semibold text-[#4A3F35]">Client Proposal</h2>
        <p className="text-xs text-[#A89880] mt-0.5">Build your quote before creating recipes</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          {TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Empty state */}
      {orderedCategories.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[#E8E0D8] py-20 text-center relative overflow-hidden">
          {/* Decorative floral background */}
          <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.04]">
            <span className="text-[320px] leading-none">❀</span>
          </div>
          <div className="absolute top-6 left-8 text-[#E8E0D8] opacity-60 pointer-events-none select-none text-4xl">✿</div>
          <div className="absolute top-10 right-10 text-[#E8E0D8] opacity-40 pointer-events-none select-none text-2xl">✾</div>
          <div className="absolute bottom-8 left-12 text-[#E8E0D8] opacity-40 pointer-events-none select-none text-2xl">❁</div>
          <div className="absolute bottom-6 right-8 text-[#E8E0D8] opacity-60 pointer-events-none select-none text-3xl">✿</div>

          <div className="relative z-10">
            <p className="font-serif text-2xl font-semibold text-[#4A3F35] mb-2">Your proposal is empty</p>
            <p className="text-sm text-[#A89880] mb-8 max-w-xs mx-auto">Add your first item to start building a beautiful client proposal.</p>
            {canEdit && (
              <Button onClick={() => { handleAddCategory(PRESET_CATEGORIES[0]); openAdd(PRESET_CATEGORIES[0]) }}>
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-3 gap-6">
          {/* Left: categories + items */}
          <div className="col-span-2 space-y-4">
            {orderedCategories.filter(cat => activeTab === 'all' || TAB_TO_CATEGORY[activeTab] === cat).map(category => {
              const catItems = groupedItems.get(category) ?? []
              const isServiceFee = category === SERVICE_FEES_CAT
              const catSubtotal = isServiceFee ? summary.svcFeesTotal : (summary.catSubtotals.get(category) ?? 0)
              const isConfirmingDelete = confirmDeleteCat === category

              return (
                <div key={category} className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E0D8]">
                    <h3 className="font-serif text-base font-semibold text-[#4A3F35]">{category}</h3>
                    <div className="flex items-center gap-3">
                      {catItems.length > 0 && (
                        <span className="text-sm font-semibold text-[#4A3F35] font-mono">{formatCurrency(catSubtotal)}</span>
                      )}
                      {canEdit && (
                        isConfirmingDelete ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[#A89880]">Delete?</span>
                            <button onClick={() => handleDeleteCategory(category)} className="text-red-500 font-medium hover:underline">Yes</button>
                            <button onClick={() => setConfirmDeleteCat(null)} className="text-[#A89880] hover:underline">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteCat(category)} className="text-[#C8BEB4] hover:text-red-400 transition-colors p-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Table header row */}
                  {catItems.length > 0 && (
                    <div className={`${isServiceFee ? SVC_HDR : ITEM_HDR} px-5 py-1.5 border-b border-[#F5F1EC] text-[10px] font-medium text-[#A89880] uppercase tracking-widest`}>
                      <span>Item</span>
                      {isServiceFee ? (
                        <>
                          <span className="text-right">Rate</span>
                          <span className="text-right">Total</span>
                          <span />
                        </>
                      ) : (
                        <>
                          <span className="text-right">Qty</span>
                          <span className="text-right">Price</span>
                          <span className="text-right">Total</span>
                          <span />
                        </>
                      )}
                    </div>
                  )}

                  {/* Item rows */}
                  <div className="divide-y divide-[#F5F1EC]">
                    {catItems.map(item =>
                      editId === item.id ? (
                        <EditItemRow key={item.id}
                          draft={editDraft}
                          isServiceFee={isServiceFee}
                          loading={editLoading}
                          onChange={d => setEditDraft(p => ({ ...p, ...d }))}
                          onSave={saveEdit}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <ItemDisplayRow key={item.id}
                          item={item}
                          isServiceFee={isServiceFee}
                          itemsSubtotal={summary.itemsSubtotal}
                          canEdit={canEdit}
                          buildingId={buildingId}
                          eventId={eventId}
                          onEdit={() => startEdit(item)}
                          onDelete={() => handleDeleteItem(item.id)}
                          onBuildRecipe={() => handleBuildRecipe(item)}
                        />
                      )
                    )}
                  </div>

                  {catItems.length === 0 && addingTo !== category && (
                    <p className="px-5 py-3 text-sm text-[#A89880]">No items yet.</p>
                  )}

                  {/* Add item form or button */}
                  {canEdit && (
                    addingTo === category ? (
                      <AddItemForm
                        category={category}
                        isServiceFee={isServiceFee}
                        form={addForm}
                        onChange={updates => setAddForm(f => ({ ...f, ...updates }))}
                        onAdd={handleAddItem}
                        onCancel={closeAdd}
                      />
                    ) : (
                      <div className="px-5 py-2.5 border-t border-[#F5F1EC]">
                        <button onClick={() => openAdd(category)}
                          className="text-xs text-[#2D5016] hover:text-[#2D5016]/70 font-medium flex items-center gap-1 transition-colors">
                          <Plus className="w-3 h-3" />
                          Add {isServiceFee ? 'fee' : 'item'}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>

          {/* Right: Proposal Summary */}
          <div>
            <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden sticky top-4">
              <div className="px-5 py-3 bg-[#F5F1EC] border-b border-[#E8E0D8]">
                <h3 className="text-sm font-semibold text-[#4A3F35]">Proposal Summary</h3>
              </div>
              <div className="px-5 py-4 space-y-1 text-sm">
                {/* Per-category subtotals */}
                {orderedCategories.filter(c => c !== SERVICE_FEES_CAT).map(cat => (
                  <div key={cat} className="flex justify-between text-[#A89880]">
                    <span>{cat}</span>
                    <span className="font-mono">{formatCurrency(summary.catSubtotals.get(cat) ?? 0)}</span>
                  </div>
                ))}

                {orderedCategories.some(c => c !== SERVICE_FEES_CAT) && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold text-[#4A3F35]">
                      <span>Florals Subtotal</span>
                      <span className="font-mono">{formatCurrency(summary.itemsSubtotal)}</span>
                    </div>
                  </>
                )}

                {summary.svcFeesTotal > 0 && (
                  <div className="flex justify-between text-[#A89880]">
                    <span>Service Fees</span>
                    <span className="font-mono">{formatCurrency(summary.svcFeesTotal)}</span>
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between text-[#A89880]">
                  <span>Pre-Tax Total</span>
                  <span className="font-mono">{formatCurrency(summary.preTaxTotal)}</span>
                </div>
                <div className="flex justify-between text-[#A89880]">
                  <span>Tax ({taxRate}%)</span>
                  <span className="font-mono">{formatCurrency(summary.taxAmount)}</span>
                </div>

                <div className="flex justify-between pt-2 pb-1 font-bold text-[#4A3F35] border-t-2 border-[#4A3F35] mt-1 text-base">
                  <span>Proposal Total</span>
                  <span className="font-mono">{formatCurrency(summary.grandTotal)}</span>
                </div>

                {/* Internal section */}
                <div className="mt-4 pt-3 border-t border-dashed border-[#E8E0D8] space-y-1">
                  <p className="text-[10px] font-semibold text-[#A89880] uppercase tracking-widest mb-2">Internal</p>
                  <div className="flex justify-between text-[#A89880]">
                    <span>Target Expense ({(100 - marginTarget).toFixed(0)}%)</span>
                    <span className="font-mono">{formatCurrency(summary.targetExpense)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-[#2D5016]">
                    <span>Target Profit ({marginTarget.toFixed(0)}%)</span>
                    <span className="font-mono">{formatCurrency(summary.targetProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ItemDisplayRow({
  item, isServiceFee, itemsSubtotal, canEdit, buildingId, eventId, onEdit, onDelete, onBuildRecipe,
}: {
  item: QuoteItemWithRecipe
  isServiceFee: boolean
  itemsSubtotal: number
  canEdit: boolean
  buildingId: string | null
  eventId: string
  onEdit: () => void
  onDelete: () => void
  onBuildRecipe: () => void
}) {
  const total = isServiceFee
    ? item.fee_type === 'percentage'
      ? (Number(item.unit_price) / 100) * itemsSubtotal
      : Number(item.unit_price)
    : Number(item.unit_price) * Number(item.quantity)

  const rateDisplay = isServiceFee
    ? item.fee_type === 'percentage'
      ? `${item.unit_price}%`
      : formatCurrency(Number(item.unit_price))
    : null

  return (
    <div className={`${isServiceFee ? SVC_ROW : ITEM_ROW} px-5 py-3 group hover:bg-[#FDFCFB] transition-colors`}>
      {/* Item name + notes subtext + recipe button */}
      <div className="min-w-0">
        <span className="text-sm font-medium text-[#4A3F35]">{item.item_name}</span>
        {item.notes && (
          <p className="text-xs text-[#A89880] mt-0.5 italic leading-snug">{item.notes}</p>
        )}
        {!isServiceFee && (
          <div className="mt-1">
            {item.recipe_id && item.recipes ? (
              <Link href={`/recipes/${item.recipe_id}?from=${eventId}`}
                className="inline-flex items-center gap-1 text-xs text-[#2D5016] hover:underline font-medium group/link">
                {item.recipes.name}
                <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover/link:opacity-100" />
              </Link>
            ) : canEdit ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onBuildRecipe}
                disabled={buildingId === item.id}
                className="h-6 px-2 text-xs text-[#2D5016] border-[#2D5016]/30 hover:bg-[#2D5016]/5 hover:border-[#2D5016] disabled:opacity-50"
              >
                {buildingId === item.id ? 'Creating…' : '+ Build Recipe'}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {isServiceFee ? (
        <>
          <span className="text-sm text-right font-mono text-[#4A3F35]">{rateDisplay}</span>
          <span className="text-sm text-right font-mono font-semibold text-[#4A3F35]">{formatCurrency(total)}</span>
        </>
      ) : (
        <>
          <span className="text-sm text-right text-[#4A3F35] pt-0.5">{Number(item.quantity)}</span>
          <span className="text-sm text-right font-mono text-[#A89880] pt-0.5">{formatCurrency(Number(item.unit_price))}</span>
          <span className="text-sm text-right font-mono font-semibold text-[#4A3F35] pt-0.5">{formatCurrency(total)}</span>
        </>
      )}

      {/* Actions — visible on hover */}
      <div className="flex items-start gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
        {canEdit && (
          <>
            <button onClick={onEdit}
              className="p-1 rounded text-[#A89880] hover:text-[#4A3F35] hover:bg-[#F5F1EC] transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={onDelete}
              className="p-1 rounded text-[#A89880] hover:text-red-400 hover:bg-red-50 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function EditItemRow({
  draft, isServiceFee, loading, onChange, onSave, onCancel,
}: {
  draft: EditDraft
  isServiceFee: boolean
  loading: boolean
  onChange: (d: Partial<EditDraft>) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="px-5 py-3 bg-[#FDFCFB] border-l-2 border-[#2D5016] space-y-2">
      {/* Row 1: main fields */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          autoFocus
          value={draft.itemName}
          onChange={e => onChange({ itemName: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
          className="flex-1 min-w-32 h-8 rounded border border-[#E8E0D8] px-2.5 text-sm text-[#4A3F35] outline-none focus:ring-1 focus:ring-[#2D5016]"
          placeholder="Item name"
        />

        {isServiceFee ? (
          <>
            <div className="flex rounded border border-[#E8E0D8] overflow-hidden text-xs shrink-0">
              {(['flat', 'percentage'] as const).map(t => (
                <button key={t} onClick={() => onChange({ feeType: t })}
                  className={`h-8 px-2.5 font-medium transition-colors ${draft.feeType === t ? 'bg-[#2D5016] text-white' : 'bg-white text-[#4A3F35] hover:bg-[#F5F1EC]'}`}>
                  {t === 'flat' ? '$ Flat' : '% Rate'}
                </button>
              ))}
            </div>
            <div className="flex items-center border border-[#E8E0D8] rounded overflow-hidden h-8 bg-white w-24 shrink-0">
              <span className="px-1.5 text-xs text-[#A89880]">{draft.feeType === 'percentage' ? '%' : '$'}</span>
              <input type="number" min="0" step="0.01" value={draft.unitPrice}
                onChange={e => onChange({ unitPrice: e.target.value })}
                className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-2 min-w-0 w-full" />
            </div>
          </>
        ) : (
          <>
            <input type="number" min="1" step="1" value={draft.quantity}
              onChange={e => onChange({ quantity: e.target.value })}
              className="w-14 h-8 rounded border border-[#E8E0D8] px-2 text-sm text-right text-[#4A3F35] outline-none focus:ring-1 focus:ring-[#2D5016] shrink-0" />
            <div className="flex items-center border border-[#E8E0D8] rounded overflow-hidden h-8 bg-white w-24 shrink-0">
              <span className="px-1.5 text-xs text-[#A89880]">$</span>
              <input type="number" min="0" step="1" value={draft.unitPrice}
                onChange={e => onChange({ unitPrice: e.target.value })}
                className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-1.5 min-w-0 w-full" />
            </div>
          </>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={onSave} disabled={loading} className="h-8 px-3 bg-[#2D5016] hover:bg-[#2D5016]/90 text-white">
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={loading} className="h-8 px-2">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 2: notes */}
      <input value={draft.notes} onChange={e => onChange({ notes: e.target.value })}
        placeholder="Notes (optional)…"
        className="w-full h-8 rounded border border-[#E8E0D8] px-2.5 text-sm text-[#4A3F35] placeholder:text-[#A89880] outline-none focus:ring-1 focus:ring-[#2D5016]" />
    </div>
  )
}

function AddItemForm({
  category, isServiceFee, form, onChange, onAdd, onCancel,
}: {
  category: string
  isServiceFee: boolean
  form: AddFormState
  onChange: (updates: Partial<AddFormState>) => void
  onAdd: () => void
  onCancel: () => void
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const presets = PRESET_ITEMS[category] ?? []
  const filtered = form.itemName
    ? presets.filter(p => p.toLowerCase().includes(form.itemName.toLowerCase()))
    : presets

  return (
    <div className="px-5 py-3 border-t border-[#E8E0D8] bg-[#FDFCFB] space-y-2">
      {/* Row 1: main fields */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Item name with suggestion dropdown */}
        <div className="relative flex-1 min-w-40">
          <input
            autoFocus
            value={form.itemName}
            onChange={e => { onChange({ itemName: e.target.value }); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={e => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') onCancel() }}
            placeholder="Item name…"
            className="w-full h-8 rounded border border-[#E8E0D8] px-2.5 text-sm text-[#4A3F35] placeholder:text-[#A89880] outline-none focus:ring-1 focus:ring-[#2D5016]"
          />
          {showSuggestions && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-[#E8E0D8] rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
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

        {isServiceFee ? (
          <>
            <div className="flex rounded border border-[#E8E0D8] overflow-hidden text-xs shrink-0">
              {(['flat', 'percentage'] as const).map(t => (
                <button key={t} onClick={() => onChange({ feeType: t })}
                  className={`h-8 px-2.5 font-medium transition-colors ${form.feeType === t ? 'bg-[#2D5016] text-white' : 'bg-white text-[#4A3F35] hover:bg-[#F5F1EC]'}`}>
                  {t === 'flat' ? '$ Flat' : '% Rate'}
                </button>
              ))}
            </div>
            <div className="flex items-center border border-[#E8E0D8] rounded overflow-hidden h-8 bg-white w-24 shrink-0">
              <span className="px-1.5 text-xs text-[#A89880]">{form.feeType === 'percentage' ? '%' : '$'}</span>
              <input type="number" min="0" step={form.feeType === 'percentage' ? '0.1' : '1'}
                value={form.unitPrice}
                onChange={e => onChange({ unitPrice: e.target.value })}
                placeholder="0"
                className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-2 min-w-0 w-full" />
            </div>
          </>
        ) : (
          <>
            <input type="number" min="1" step="1" value={form.quantity}
              onChange={e => onChange({ quantity: e.target.value })}
              className="w-14 h-8 rounded border border-[#E8E0D8] px-2 text-sm text-right text-[#4A3F35] outline-none focus:ring-1 focus:ring-[#2D5016] shrink-0" />
            <div className="flex items-center border border-[#E8E0D8] rounded overflow-hidden h-8 bg-white w-24 shrink-0">
              <span className="px-1.5 text-xs text-[#A89880]">$</span>
              <input type="number" min="0" step="1" value={form.unitPrice}
                onChange={e => onChange({ unitPrice: e.target.value })}
                placeholder="0"
                className="flex-1 text-sm text-[#4A3F35] bg-transparent outline-none pr-1.5 min-w-0 w-full" />
            </div>
          </>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={onAdd} disabled={!form.itemName.trim() || form.loading}
            className="h-8 px-3 bg-[#2D5016] hover:bg-[#2D5016]/90 text-white text-xs">
            {form.loading ? 'Adding…' : 'Add'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={form.loading} className="h-8 px-2 text-xs">
            Cancel
          </Button>
        </div>
      </div>

      {/* Row 2: notes */}
      <input value={form.notes} onChange={e => onChange({ notes: e.target.value })}
        placeholder="Notes (optional)…"
        className="w-full h-8 rounded border border-[#E8E0D8] px-2.5 text-sm text-[#4A3F35] placeholder:text-[#A89880] outline-none focus:ring-1 focus:ring-[#2D5016]" />
    </div>
  )
}
