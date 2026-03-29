'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MarginBadgeProps {
  marginPct: number
  marginTarget?: number
  size?: 'sm' | 'md'
  showValue?: boolean
  className?: string
}

export function MarginBadge({
  marginPct,
  marginTarget = 70,
  size = 'md',
  showValue = true,
  className,
}: MarginBadgeProps) {
  const health = marginPct >= marginTarget
    ? 'green'
    : marginPct >= marginTarget - 5
    ? 'yellow'
    : 'red'

  const colors = {
    green:  { bg: 'rgba(39,174,96,0.12)',  text: '#1E8449' },
    yellow: { bg: 'rgba(243,156,18,0.12)', text: '#D68910' },
    red:    { bg: 'rgba(192,57,43,0.12)',  text: '#C0392B' },
  }

  const labels = {
    green: 'On target',
    yellow: 'Below target',
    red: 'Off target',
  }

  return (
    <motion.span
      animate={{
        backgroundColor: colors[health].bg,
        color: colors[health].text,
      }}
      transition={{ duration: 0.4 }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm',
        className
      )}
    >
      <motion.span
        animate={{ backgroundColor: colors[health].text }}
        transition={{ duration: 0.4 }}
        className="inline-block w-1.5 h-1.5 rounded-full"
      />
      {showValue && (
        <span className="tabular-nums">{marginPct.toFixed(1)}%</span>
      )}
      {!showValue && <span>{labels[health]}</span>}
    </motion.span>
  )
}
