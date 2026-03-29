import { cn } from '@/lib/utils'

interface ColorSwatchProps {
  hex: string | null | undefined
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function ColorSwatch({ hex, name, size = 'sm', className }: ColorSwatchProps) {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }

  if (!hex) {
    return (
      <span
        className={cn(
          'rounded-full border border-dashed border-[#E8E0D8] bg-[#F5F1EC] flex-shrink-0',
          sizes[size],
          className
        )}
        title={name || 'No color'}
      />
    )
  }

  return (
    <span
      className={cn(
        'rounded-full border border-black/10 flex-shrink-0 inline-block',
        sizes[size],
        className
      )}
      style={{ backgroundColor: hex }}
      title={name || hex}
    />
  )
}
