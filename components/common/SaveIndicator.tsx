'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SaveIndicatorProps {
  status: 'saved' | 'unsaved' | 'saving'
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[#A89880]">
      <motion.span
        animate={{
          backgroundColor:
            status === 'saved'  ? '#27AE60' :
            status === 'saving' ? '#C9A84C' :
            '#A89880',
        }}
        transition={{ duration: 0.3 }}
        className="w-1.5 h-1.5 rounded-full"
      />
      <span>
        {status === 'saved'  ? 'Saved' :
         status === 'saving' ? 'Saving…' :
         'Unsaved changes'}
      </span>
    </div>
  )
}
