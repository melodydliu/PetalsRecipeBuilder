'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Copy, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { createEvent, deleteEvent, duplicateEvent } from './actions'
import type { Event } from '@/types/database'

type EventWithCount = Event & { event_recipes: { recipe_id: string }[] }

export function EventList({ initialEvents, role }: { initialEvents: EventWithCount[]; role: string }) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ client_name: '', event_date: '', venue: '' })
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setCreateError(null)
    const { data, error } = await createEvent({
      name: form.client_name,
      client_name: form.client_name,
      event_date: form.event_date || undefined,
      venue: form.venue || undefined,
    })
    if (data) {
      setEvents(prev => [data as EventWithCount, ...prev])
      setShowCreate(false)
      setForm({ client_name: '', event_date: '', venue: '' })
      router.push(`/events/${data.id}`)
    } else {
      setCreateError(error ?? 'Failed to create event')
    }
    setLoading(false)
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
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Client</th>
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Date</th>
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Venue</th>
              <th className="px-4 py-1 text-left text-[12px] font-semibold text-body">Recipes</th>
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
                  <td className="px-4 py-1 font-medium text-body truncate max-w-0">{event.client_name || '—'}</td>
                  <td className="px-4 py-1 text-subtle">
                    {event.event_date
                      ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-1 text-subtle">{event.venue || '—'}</td>
                  <td className="px-4 py-1 text-subtle">{event.event_recipes?.length ?? 0}</td>
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

      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) { setCreateError(null); setDatePickerOpen(false) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client name *</Label>
              <Input placeholder="Sarah & James Smith" value={form.client_name} onChange={e => set('client_name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Event date</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-full h-9 px-3 flex items-center gap-2 rounded-md border border-border bg-white text-sm text-left cursor-pointer hover:bg-muted transition-colors">
                      <CalendarDays className="w-3.5 h-3.5 text-subtle shrink-0" />
                      {form.event_date
                        ? new Date(form.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : <span className="text-subtle">Pick a date</span>
                      }
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.event_date ? new Date(form.event_date + 'T00:00:00') : undefined}
                      onSelect={date => {
                        if (date) {
                          const y = date.getFullYear()
                          const m = String(date.getMonth() + 1).padStart(2, '0')
                          const d = String(date.getDate()).padStart(2, '0')
                          set('event_date', `${y}-${m}-${d}`)
                        } else {
                          set('event_date', '')
                        }
                        setDatePickerOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
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
              <Button type="submit" disabled={loading || !form.client_name.trim()}>
                {loading ? 'Creating…' : 'Create event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
