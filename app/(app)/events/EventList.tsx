'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createEvent, cycleEventStatus, deleteEvent, duplicateEvent } from './actions'
import type { Event, EventStatus } from '@/types/database'

type EventWithCount = Event & { event_recipes: { recipe_id: string }[] }

const STATUS_LABELS: Record<EventStatus, string> = {
  to_do: 'To Do', in_progress: 'In Progress', ordered: 'Ordered', complete: 'Complete',
}
const STATUS_VARIANTS: Record<EventStatus, Parameters<typeof Badge>[0]['variant']> = {
  to_do: 'draft', in_progress: 'blush', ordered: 'gold', complete: 'green',
}

export function EventList({ initialEvents, role }: { initialEvents: EventWithCount[]; role: string }) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', client_name: '', event_date: '', venue: '' })
  const [loading, setLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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
    const cycle: EventStatus[] = ['to_do', 'in_progress', 'ordered', 'complete']
    const nextStatus = cycle[(cycle.indexOf(currentStatus) + 1) % cycle.length]
    setEvents(prev => prev.map(e => e.id === id ? { ...e, recipe_status: nextStatus } : e))
    await cycleEventStatus(id, currentStatus)
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setEvents(prev => prev.filter(e => e.id !== confirmDeleteId))
    setConfirmDeleteId(null)
    await deleteEvent(confirmDeleteId)
  }

  const handleDuplicate = async (id: string) => {
    const { data } = await duplicateEvent(id)
    if (data) setEvents(prev => [{ ...data, event_recipes: [] } as EventWithCount, ...prev])
  }

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-forest">Events</h1>
        <Button size="sm" className="cursor-pointer gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> New Event
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Event</th>
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Client</th>
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Date</th>
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Venue</th>
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Recipes</th>
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Status</th>
              <th className="px-4 py-1" />
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
                  className="text-[14px] border-b border-row-border last:border-0 hover:bg-muted cursor-pointer group"
                >
                  <td className="px-4 py-1 font-medium text-body truncate max-w-0">{event.name}</td>
                  <td className="px-4 py-1 text-subtle">{event.client_name || '—'}</td>
                  <td className="px-4 py-1 text-subtle">
                    {event.event_date
                      ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-1 text-subtle">{event.venue || '—'}</td>
                  <td className="px-4 py-1 text-subtle">{event.event_recipes?.length ?? 0}</td>
                  <td className="px-4 py-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleCycleStatus(event.id, event.recipe_status) }}
                    >
                      <Badge variant={STATUS_VARIANTS[event.recipe_status]}>
                        {STATUS_LABELS[event.recipe_status]}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-1 text-right">
                    <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDuplicate(event.id)} className="px-2 py-1 border border-border hover:border-body hover:bg-muted cursor-pointer transition-colors rounded-md">
                        <Copy className="w-3.5 h-3.5 text-subtle" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(event.id)} className="px-2 py-1 border border-border hover:border-body hover:bg-muted cursor-pointer transition-colors rounded-md">
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-medium text-body mb-1">No events yet</p>
            <p className="text-sm text-subtle mb-4">Events group your recipes and track order status</p>
            <Button size="sm" className="cursor-pointer gap-1" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" /> Create first event
            </Button>
          </div>
        )}
      </Card>
      <p className="text-xs text-subtle mt-3">{events.length} event{events.length !== 1 ? 's' : ''} total</p>

      <Dialog open={!!confirmDeleteId} onOpenChange={v => { if (!v) setConfirmDeleteId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete event?</DialogTitle></DialogHeader>
          <p className="text-sm text-subtle">This will permanently delete the event and cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
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
              <p className="text-sm text-danger bg-red-50 rounded-md px-3 py-2">{createError}</p>
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
