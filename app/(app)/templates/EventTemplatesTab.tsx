'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, ArrowRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { useEventTemplate, deleteEventTemplate } from './actions'

export type EventTemplateItem = {
  id: string
  name: string
  notes: string | null
  recipeCount: number
  recipeNames: string[]
  deliveryFee: number | null
  setupFee: number | null
  teardownFee: number | null
  taxRate: number | null
  updatedAt: string
}

interface EventTemplatesTabProps {
  initialEventTemplates: EventTemplateItem[]
  queryError: string | null
}

export function EventTemplatesTab({ initialEventTemplates, queryError }: EventTemplatesTabProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialEventTemplates)
  const [useLoadingId, setUseLoadingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUseTemplate = async (id: string) => {
    setUseLoadingId(id)
    setError(null)
    const { data, error: err } = await useEventTemplate(id)
    setUseLoadingId(null)
    if (err) { setError(err); return }
    if (data) router.push(`/events/${data.id}`)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    setDeleteLoading(true)
    const { error: err } = await deleteEventTemplate(deleteConfirmId)
    setDeleteLoading(false)
    if (err) { setError(err); return }
    setTemplates(prev => prev.filter(t => t.id !== deleteConfirmId))
    setDeleteConfirmId(null)
  }

  if (queryError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 inline-block">
          Error loading event templates: {queryError}
        </p>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
        <p className="text-4xl mb-4">📅</p>
        <p className="font-serif text-xl text-[#4A3F35] mb-2">No event templates yet</p>
        <p className="text-sm text-[#A89880]">
          Open an event and click <span className="font-medium text-[#4A3F35]">"Save as Template"</span> to create one.
        </p>
      </motion.div>
    )
  }

  return (
    <div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {templates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-[#E8E0D8] p-5 flex flex-col gap-3 hover:border-[#A89880] transition-colors"
            >
              {/* Name + modified */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-serif text-base font-semibold text-[#4A3F35] leading-snug">{template.name}</p>
                <p className="text-xs text-[#A89880] whitespace-nowrap mt-0.5">
                  {new Date(template.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Notes excerpt */}
              {template.notes && (
                <p className="text-xs text-[#A89880] line-clamp-1">{template.notes}</p>
              )}

              {/* Recipe count + names */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-[#2D5016]/10 px-2 py-0.5 text-xs font-medium text-[#2D5016]">
                  <Calendar className="w-3 h-3 mr-1" />
                  {template.recipeCount} {template.recipeCount === 1 ? 'recipe' : 'recipes'}
                </span>
                {template.recipeNames.slice(0, 3).map(name => (
                  <span key={name} className="inline-flex items-center rounded-md bg-[#F5F1EC] border border-[#E8E0D8] px-2 py-0.5 text-xs text-[#4A3F35]">
                    {name}
                  </span>
                ))}
                {template.recipeCount > 3 && (
                  <span className="text-xs text-[#A89880]">+{template.recipeCount - 3} more</span>
                )}
              </div>

              {/* Fees / tax summary */}
              {(template.deliveryFee != null || template.setupFee != null || template.teardownFee != null || template.taxRate != null) && (
                <p className="text-xs text-[#A89880]">
                  {[
                    template.deliveryFee != null && `Delivery ${formatCurrency(template.deliveryFee)}`,
                    template.setupFee != null && `Setup ${formatCurrency(template.setupFee)}`,
                    template.teardownFee != null && `Teardown ${formatCurrency(template.teardownFee)}`,
                    template.taxRate != null && `Tax ${template.taxRate}%`,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-auto pt-1">
                <button
                  onClick={() => setDeleteConfirmId(template.id)}
                  className="p-1.5 rounded-md hover:bg-[#FFF5F5] transition-colors group/del"
                  title="Delete template"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#A89880] group-hover/del:text-[#C0392B] transition-colors" />
                </button>
                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(template.id)}
                  disabled={useLoadingId === template.id}
                  className="bg-[#2D5016] hover:bg-[#2D5016]/90 text-white text-xs h-8 px-3"
                >
                  {useLoadingId === template.id ? 'Creating…' : (
                    <>Use Template <ArrowRight className="w-3 h-3 ml-1.5" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#2D5016]">Delete event template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#4A3F35]">
            This will permanently delete the template and all its copied recipes. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
