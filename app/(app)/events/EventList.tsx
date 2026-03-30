'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Trash2, ChevronRight, BookmarkPlus, ChevronDown, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createEvent, cycleEventStatus, deleteEvent } from './actions'
import { saveEventAsTemplate, useEventTemplate } from '@/app/(app)/templates/actions'
import type { Event, EventStatus } from '@/types/database'

type EventWithCount = Event & { event_recipes: { recipe_id: string }[] }

const STATUS_LABELS: Record<EventStatus, string> = {
  to_do: 'To Do', in_progress: 'In Progress', ordered: 'Ordered', complete: 'Complete',
}
const STATUS_VARIANTS: Record<EventStatus, Parameters<typeof Badge>[0]['variant']> = {
  to_do: 'draft', in_progress: 'blush', ordered: 'gold', complete: 'green',
}
const STATUS_NEXT: Record<EventStatus, string> = {
  to_do: 'Start →', in_progress: 'Mark Ordered →', ordered: 'Complete →', complete: 'Reset →',
}

type EventTemplate = { id: string; name: string }

export function EventList({ initialEvents, role, eventTemplates }: { initialEvents: EventWithCount[]; role: string; eventTemplates: EventTemplate[] }) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', client_name: '', event_date: '', venue: '' })
  const [loading, setLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [templateDialogEventId, setTemplateDialogEventId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [fromTemplateLoading, setFromTemplateLoading] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setCreateError(null)
    const { data, error } = await createEvent({
      name: form.name,
      client_name: form.client_name || undefined,
      event_date: form.event_date || undefined,
      venue: form.venue || undefined,
    })
    if (data) {
      setEvents(prev => [data as EventWithCount, ...prev])
      setShowCreate(false)
      setForm({ name: '', client_name: '', event_date: '', venue: '' })
      router.push(`/events/${data.id}`)
    } else {
      setCreateError(error ?? 'Failed to create event')
    }
    setLoading(false)
  }

  const handleCycleStatus = async (id: string, currentStatus: EventStatus) => {
    // Optimistic
    const cycle: EventStatus[] = ['to_do', 'in_progress', 'ordered', 'complete']
    const nextStatus = cycle[(cycle.indexOf(currentStatus) + 1) % cycle.length]
    setEvents(prev => prev.map(e => e.id === id ? { ...e, recipe_status: nextStatus } : e))
    await cycleEventStatus(id, currentStatus)
  }

  const handleDelete = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    await deleteEvent(id)
  }

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openTemplateDialog = (e: React.MouseEvent, event: EventWithCount) => {
    e.stopPropagation()
    setTemplateDialogEventId(event.id)
    setTemplateName(event.name)
    setTemplateError(null)
  }

  const handleSaveAsTemplate = async () => {
    if (!templateDialogEventId) return
    const name = templateName.trim()
    if (!name) return
    setTemplateLoading(true)
    setTemplateError(null)
    const { error } = await saveEventAsTemplate(templateDialogEventId, name)
    setTemplateLoading(false)
    if (error) { setTemplateError(error); return }
    setTemplateDialogEventId(null)
  }

  const handleFromTemplate = async (templateId: string) => {
    setFromTemplateLoading(templateId)
    const { data, error } = await useEventTemplate(templateId)
    setFromTemplateLoading(null)
    if (data) {
      setShowTemplatePicker(false)
      router.push(`/events/${data.id}`)
    } else {
      console.error('Failed to create event from template:', error)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#2D5016]">Events</h1>
          <p className="text-sm text-[#A89880] mt-1">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center">
          <Button onClick={() => setShowCreate(true)} className="rounded-r-none border-r border-forest/30">
            <Plus className="w-4 h-4 mr-1.5" /> New Event
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-l-none px-2">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Blank event
              </DropdownMenuItem>
              {eventTemplates.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowTemplatePicker(true)}>
                    <LayoutTemplate className="w-4 h-4 mr-2" /> From template
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E0D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8] bg-[#F5F1EC]">
              <th className="text-left px-3 py-2 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Event</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Client</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Date</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Venue</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Recipes</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-[#A89880] uppercase tracking-wide">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {events.map((event, i) => (
                <motion.tr
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#FAF7F2] cursor-pointer group"
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-sm text-[#4A3F35]">{event.name}</p>
                  </td>
                  <td className="px-3 py-2 text-sm text-[#A89880]">{event.client_name || '—'}</td>
                  <td className="px-3 py-2 text-sm text-[#A89880]">
                    {event.event_date
                      ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-[#A89880]">{event.venue || '—'}</td>
                  <td className="px-3 py-2 text-center text-sm text-[#A89880]">
                    {event.event_recipes?.length ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleCycleStatus(event.id, event.recipe_status) }}
                      className="flex items-center gap-1 group/status"
                    >
                      <Badge variant={STATUS_VARIANTS[event.recipe_status]}>
                        {STATUS_LABELS[event.recipe_status]}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button size="icon-sm" variant="ghost" title="Save as template" onClick={e => openTemplateDialog(e, event)}>
                        <BookmarkPlus className="w-3.5 h-3.5 text-[#A89880]" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={e => { e.stopPropagation(); handleDelete(event.id) }}>
                        <Trash2 className="w-3.5 h-3.5 text-[#C0392B]" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="font-medium text-[#4A3F35] mb-1">No events yet</p>
            <p className="text-sm text-[#A89880] mb-4">Events group your recipes and track order status</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create first event
            </Button>
          </div>
        )}
      </div>

      {/* Save as Template dialog */}
      <Dialog open={!!templateDialogEventId} onOpenChange={open => { if (!open) setTemplateDialogEventId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Event Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogEventId(null)} disabled={templateLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={templateLoading || !templateName.trim()}
            >
              {templateLoading ? 'Saving…' : 'Save as Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* From Template picker dialog */}
      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Event from Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {eventTemplates.length === 0 ? (
              <p className="text-sm text-subtle py-4 text-center">No event templates saved yet.</p>
            ) : (
              eventTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleFromTemplate(t.id)}
                  disabled={fromTemplateLoading === t.id}
                  className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-between group"
                >
                  <span className="font-medium text-sm text-body">{t.name}</span>
                  {fromTemplateLoading === t.id
                    ? <span className="text-xs text-subtle">Creating…</span>
                    : <ChevronRight className="w-4 h-4 text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                  }
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatePicker(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setCreateError(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Event name *</Label>
              <Input placeholder="Smith Wedding" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Client name</Label>
              <Input placeholder="Sarah & James Smith" value={form.client_name} onChange={e => set('client_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Event date</Label>
                <Input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Venue</Label>
                <Input placeholder="The Grand Hotel" value={form.venue} onChange={e => set('venue', e.target.value)} />
              </div>
            </div>
            {createError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{createError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !form.name.trim()}>
                {loading ? 'Creating…' : 'Create event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
