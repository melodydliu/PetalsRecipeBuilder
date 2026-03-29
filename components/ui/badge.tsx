import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:  'bg-[#2D5016]/10 text-[#2D5016]',
        outline:  'border border-[#E8E0D8] text-[#4A3F35]',
        draft:    'bg-[#F5F1EC] text-[#A89880]',
        active:   'bg-[#2D5016]/10 text-[#2D5016]',
        archived: 'bg-[#E8E0D8] text-[#A89880]',
        green:    'bg-[#27AE60]/15 text-[#1E8449]',
        yellow:   'bg-[#F39C12]/15 text-[#D68910]',
        red:      'bg-[#C0392B]/15 text-[#C0392B]',
        blush:    'bg-[#E8A598]/20 text-[#B07060]',
        gold:     'bg-[#C9A84C]/20 text-[#A08030]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
