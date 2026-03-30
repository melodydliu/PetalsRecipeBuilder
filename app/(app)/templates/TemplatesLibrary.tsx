'use client'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Filter, Check, BookOpen, Calendar, ChevronDown, X, ArrowRight, Pencil, Copy, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_LABELS } from '@/lib/constants'
import { createTemplate, updateStyleTags, useTemplateForEvent, duplicateTemplate, archiveTemplate } from './actions'
import { PaletteStrip } from '@/components/common/PaletteStrip'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { EventTemplatesTab } from './EventTemplatesTab'
import type { EventTemplateItem } from './EventTemplatesTab'

// ─── Style Options ────────────────────────────────────────────

const STYLE_OPTIONS = [
  { value: 'garden',     label: 'Garden',     bg: 'bg-green-100',   text: 'text-green-700' },
  { value: 'tropical',   label: 'Tropical',   bg: 'bg-teal-100',    text: 'text-teal-700' },
  { value: 'modern',     label: 'Modern',     bg: 'bg-slate-100',   text: 'text-slate-600' },
  { value: 'whimsical',  label: 'Whimsical',  bg: 'bg-purple-100',  text: 'text-purple-700' },
  { value: 'romantic',   label: 'Romantic',   bg: 'bg-pink-100',    text: 'text-pink-700' },
  { value: 'minimal',    label: 'Minimal',    bg: 'bg-gray-100',    text: 'text-gray-600' },
  { value: 'lush',       label: 'Lush',       bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { value: 'wildflower', label: 'Wildflower', bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  { value: 'bohemian',   label: 'Bohemian',   bg: 'bg-amber-100',   text: 'text-amber-700' },
  { value: 'elegant',    label: 'Elegant',    bg: 'bg-stone-100',   text: 'text-stone-600' },
] as const

type StyleValue = typeof STYLE_OPTIONS[number]['value']
const STYLE_MAP = Object.fromEntries(STYLE_OPTIONS.map(s => [s.value, s])) as Record<string, typeof STYLE_OPTIONS[number]>

// ─── Types ────────────────────────────────────────────────────

type Template = {
  id: string
  name: string
  itemType: string | null
  styles: string[]
  colors: { hex: string | null; name: string | null }[]
  updatedAt: string
}

type EventOption = {
  id: string
  name: string
  client_name: string | null
  event_date: string | null
}

interface TemplatesLibraryProps {
  initialTemplates: Template[]
  events: EventOption[]
  initialEventTemplates: EventTemplateItem[]
  eventTemplateQueryError: string | null
}

// ─── Style Tag ────────────────────────────────────────────────

function StyleTag({ value }: { value: string }) {
  const style = STYLE_MAP[value]
  if (!style) return <span className="text-xs text-[#A89880]">{value}</span>
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', style.bg, style.text)}>
      {style.label}
    </span>
  )
}

// ─── Item Type Pill ───────────────────────────────────────────

function ItemTypePill({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-[#A89880] italic">— unset —</span>
  return (
    <span className="inline-flex items-center rounded-md bg-[#F5F1EC] px-2 py-0.5 text-xs font-medium text-[#4A3F35] border border-[#E8E0D8]">
      {EVENT_TYPE_LABELS[value] ?? value}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────

export function TemplatesLibrary({ initialTemplates, events, initialEventTemplates, eventTemplateQueryError }: TemplatesLibraryProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [search, setSearch] = useState('')
  const [filterItemType, setFilterItemType] = useState('all')
  const [filterStyle, setFilterStyle] = useState('all')
  const [editingItemTypeId, setEditingItemTypeId] = useState<string | null>(null)
  const [editingStylesId, setEditingStylesId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null })
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [addedEventId, setAddedEventId] = useState<string | null>(null)
  const [addedRecipeId, setAddedRecipeId] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [newLoading, setNewLoading] = useState(false)

  const filtered = useMemo(() => {
    let list = templates
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q))
    }
    if (filterItemType !== 'all') list = list.filter(t => t.itemType === filterItemType)
    if (filterStyle !== 'all') list = list.filter(t => t.styles.includes(filterStyle))
    return list
  }, [templates, search, filterItemType, filterStyle])

  // ── Item type inline edit ──────────────────────────────────

  const updateItemType = (id: string, value: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, itemType: value } : t))
    setEditingItemTypeId(null)
  }

  // ── Style inline edit — optimistic, saved on popover close ──

  const toggleStyle = (id: string, style: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== id) return t
      const next = t.styles.includes(style) ? t.styles.filter(s => s !== style) : [...t.styles, style]
      return { ...t, styles: next }
    }))
  }

  const handleStylesPopoverClose = (id: string) => {
    const current = templates.find(t => t.id === id)
    if (current) updateStyleTags(id, current.styles)
    setEditingStylesId(null)
  }

  // ── Item type popover close — persist ─────────────────────

  const handleItemTypePopoverClose = (id: string, committed: boolean) => {
    if (!committed) setEditingItemTypeId(null)
    // if committed, already closed in updateItemType
  }

  // ── Use Template modal ────────────────────────────────────

  const openUseTemplate = (template: Template) => {
    setModal({ open: true, template })
    setSelectedEventId(null)
    setAddedEventId(null)
    setAddedRecipeId(null)
    setAddError(null)
  }

  const closeModal = () => {
    setModal({ open: false, template: null })
    setSelectedEventId(null)
    setAddedEventId(null)
    setAddedRecipeId(null)
    setAddError(null)
    setAddLoading(false)
  }

  const handleAddToEvent = async () => {
    if (!modal.template || !selectedEventId) return
    setAddLoading(true)
    setAddError(null)
    const { data, error } = await useTemplateForEvent(modal.template.id, selectedEventId)
    setAddLoading(false)
    if (error) { setAddError(error); return }
    setAddedEventId(selectedEventId)
    setAddedRecipeId(data?.id ?? null)
  }

  // ── Row actions ───────────────────────────────────────────

  const handleEdit = (id: string) => router.push(`/recipes/${id}`)

  const handleDuplicate = async (id: string) => {
    const { data } = await duplicateTemplate(id)
    if (data) {
      // Find original to copy its colors into the optimistic entry
      const original = templates.find(t => t.id === id)
      setTemplates(prev => [{
        id: data.id,
        name: data.name,
        itemType: data.event_type ?? null,
        styles: (data.style_tags as string[]) ?? [],
        colors: original?.colors ?? [],
        updatedAt: data.updated_at,
      }, ...prev])
    }
  }

  const handleArchive = async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
    await archiveTemplate(id)
  }

  // ── New Template ──────────────────────────────────────────

  const handleNewTemplate = async () => {
    setNewLoading(true)
    const { data } = await createTemplate()
    if (data) router.push(`/recipes/${data.id}`)
    setNewLoading(false)
  }

  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'events' ? 'events' : 'recipes'
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Templates</h1>
          <p className="text-sm text-[#A89880] mt-1">Reusable designs for your studio</p>
        </div>
        {activeTab === 'recipes' && (
          <Button onClick={handleNewTemplate} disabled={newLoading}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Template
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            Recipe Templates
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Event Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes">
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A89880]" />
              <Input
                placeholder="Search templates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-56"
              />
            </div>

            <Select value={filterItemType} onValueChange={setFilterItemType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All item types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All item types</SelectItem>
                {EVENT_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStyle} onValueChange={setFilterStyle}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All styles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All styles</SelectItem>
                {STYLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterItemType !== 'all' || filterStyle !== 'all' || search) && (
              <button
                onClick={() => { setSearch(''); setFilterItemType('all'); setFilterStyle('all') }}
                className="text-xs text-[#A89880] hover:text-[#4A3F35] flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}

            <p className="ml-auto text-xs text-[#A89880]">
              {filtered.length} template{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
              <p className="text-4xl mb-4">🌺</p>
              <p className="font-serif text-xl text-[#4A3F35] mb-2">No templates yet</p>
              <p className="text-sm text-[#A89880] mb-6">
                {search || filterItemType !== 'all' || filterStyle !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Mark a recipe as a template in the recipe builder, or create a new one here'}
              </p>
              {!search && filterItemType === 'all' && filterStyle === 'all' && (
                <Button onClick={handleNewTemplate} disabled={newLoading}>
                  <Plus className="w-4 h-4 mr-2" /> New Template
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D8] bg-[#F5F1EC]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Item Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Colors</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Style</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Modified</th>
                    <th className="px-4 py-3 w-36"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filtered.map((template, i) => (
                      <motion.tr
                        key={template.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#FAF7F2] group"
                      >
                        {/* Name */}
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/recipes/${template.id}`}
                            className="font-medium text-sm text-[#2D5016] hover:underline"
                          >
                            {template.name}
                          </Link>
                        </td>

                        {/* Item Type — inline editable */}
                        <td className="px-4 py-3.5">
                          <Popover
                            open={editingItemTypeId === template.id}
                            onOpenChange={open => {
                              if (open) {
                                setEditingItemTypeId(template.id)
                              } else {
                                handleItemTypePopoverClose(template.id, false)
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 -mx-1.5 -my-1 hover:bg-[#F5F1EC] transition-colors group/cell">
                                <ItemTypePill value={template.itemType} />
                                <ChevronDown className="w-3 h-3 text-[#A89880] opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-56 p-1.5 max-h-72 overflow-y-auto">
                              <p className="text-[10px] font-semibold text-[#A89880] uppercase tracking-wide px-2 py-1.5">Item Type</p>
                              {EVENT_TYPE_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateItemType(template.id, opt.value)}
                                  className={cn(
                                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-[#F5F1EC] transition-colors',
                                    template.itemType === opt.value ? 'text-[#2D5016] font-medium' : 'text-[#4A3F35]'
                                  )}
                                >
                                  {template.itemType === opt.value
                                    ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                    : <span className="w-3.5 h-3.5 flex-shrink-0" />
                                  }
                                  {opt.label}
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </td>

                        {/* Colors */}
                        <td className="px-4 py-3.5">
                          <PaletteStrip
                            colors={template.colors}
                            maxColors={6}
                            size="sm"
                          />
                        </td>

                        {/* Style — multi-select inline */}
                        <td className="px-4 py-3.5">
                          <Popover
                            open={editingStylesId === template.id}
                            onOpenChange={open => {
                              if (open) {
                                setEditingStylesId(template.id)
                              } else {
                                handleStylesPopoverClose(template.id)
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button className="flex flex-wrap items-center gap-1 rounded-md px-1.5 py-1 -mx-1.5 -my-1 hover:bg-[#F5F1EC] transition-colors group/style max-w-xs text-left">
                                {template.styles.length === 0
                                  ? <span className="text-xs text-[#A89880] italic">Add style…</span>
                                  : template.styles.map(s => <StyleTag key={s} value={s} />)
                                }
                                <ChevronDown className="w-3 h-3 text-[#A89880] opacity-0 group-hover/style:opacity-100 transition-opacity ml-0.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-48 p-1.5">
                              <p className="text-[10px] font-semibold text-[#A89880] uppercase tracking-wide px-2 py-1.5">Style Tags</p>
                              {STYLE_OPTIONS.map(opt => {
                                const selected = template.styles.includes(opt.value)
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => toggleStyle(template.id, opt.value)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-[#F5F1EC] transition-colors"
                                  >
                                    <div className={cn(
                                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                                      selected ? 'bg-[#2D5016] border-[#2D5016]' : 'border-[#E8E0D8]'
                                    )}>
                                      {selected && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <StyleTag value={opt.value} />
                                  </button>
                                )
                              })}
                            </PopoverContent>
                          </Popover>
                        </td>

                        {/* Modified */}
                        <td className="px-4 py-3.5 text-sm text-[#A89880] whitespace-nowrap">
                          {new Date(template.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            {/* Secondary actions */}
                            <div className="flex items-center gap-0.5">
                              <button
                                title="Edit in builder"
                                onClick={() => handleEdit(template.id)}
                                className="p-1.5 rounded-md hover:bg-[#F5F1EC] transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#A89880]" />
                              </button>
                              <button
                                title="Duplicate template"
                                onClick={() => handleDuplicate(template.id)}
                                className="p-1.5 rounded-md hover:bg-[#F5F1EC] transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-[#A89880]" />
                              </button>
                              <button
                                title="Archive template"
                                onClick={() => handleArchive(template.id)}
                                className="p-1.5 rounded-md hover:bg-[#FFF5F5] transition-colors group/archive"
                              >
                                <Archive className="w-3.5 h-3.5 text-[#A89880] group-hover/archive:text-[#C0392B] transition-colors" />
                              </button>
                              <div className="w-px h-4 bg-[#E8E0D8] mx-1" />
                            </div>
                            {/* Primary CTA */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openUseTemplate(template)}
                              className="text-xs h-8 px-3 border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016] hover:text-white transition-colors shrink-0"
                            >
                              Use Template
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="events">
          <EventTemplatesTab initialEventTemplates={initialEventTemplates} queryError={eventTemplateQueryError} />
        </TabsContent>
      </Tabs>

      {/* ─── Use Template Modal ─────────────────────────────────── */}
      <Dialog open={modal.open} onOpenChange={open => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#2D5016]">Use Template</DialogTitle>
          </DialogHeader>

          {modal.template && (
            <div>
              {addedEventId ? (
                /* ── Success state ── */
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-[#2D5016]/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-5 h-5 text-[#2D5016]" />
                  </div>
                  <p className="font-medium text-[#4A3F35] mb-1">Recipe added!</p>
                  <p className="text-sm text-[#A89880] mb-5">
                    Added to{' '}
                    <span className="text-[#4A3F35] font-medium">
                      {events.find(e => e.id === addedEventId)?.name}
                    </span>
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="ghost" onClick={closeModal} className="text-[#A89880]">Done</Button>
                    {addedRecipeId && (
                      <Button asChild className="bg-[#2D5016] hover:bg-[#2D5016]/90 text-white">
                        <Link href={`/recipes/${addedRecipeId}`} onClick={closeModal}>
                          Open Recipe <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* ── Select event ── */
                <>
                  <p className="text-sm text-[#4A3F35] mb-1">
                    Add <span className="font-medium">"{modal.template.name}"</span> to an event
                  </p>
                  <p className="text-xs text-[#A89880] mb-4">
                    A copy of this recipe will be created and linked to the selected event.
                  </p>

                  {events.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-[#E8E0D8] rounded-lg mb-4">
                      <p className="text-sm text-[#A89880]">No events found.</p>
                      <p className="text-xs text-[#A89880] mt-1">
                        <Link href="/events" className="underline hover:text-[#4A3F35]">Create an event</Link> first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {events.map(event => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEventId(event.id)}
                          className={cn(
                            'w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                            selectedEventId === event.id
                              ? 'border-[#2D5016] bg-[#2D5016]/5'
                              : 'border-[#E8E0D8] hover:border-[#A89880] hover:bg-[#FAF7F2]'
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors',
                            selectedEventId === event.id ? 'border-[#2D5016]' : 'border-[#E8E0D8]'
                          )}>
                            {selectedEventId === event.id && (
                              <div className="w-2 h-2 rounded-full bg-[#2D5016]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#4A3F35]">{event.name}</p>
                            <p className="text-xs text-[#A89880] mt-0.5">
                              {event.client_name && <span>{event.client_name} · </span>}
                              {event.event_date
                                ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'No date set'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {addError && (
                    <p className="text-xs text-red-600 mb-3">{addError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={closeModal} className="text-[#A89880]">Cancel</Button>
                    <Button
                      onClick={handleAddToEvent}
                      disabled={!selectedEventId || addLoading || events.length === 0}
                      className="bg-[#2D5016] hover:bg-[#2D5016]/90 text-white"
                    >
                      {addLoading ? 'Adding…' : 'Add to Event'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
