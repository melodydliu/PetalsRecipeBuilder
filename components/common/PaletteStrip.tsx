import { ColorSwatch } from './ColorSwatch'

interface PaletteColor {
  hex: string | null
  name: string | null
}

interface PaletteStripProps {
  colors: PaletteColor[]
  maxColors?: number
  size?: 'xs' | 'sm' | 'md'
}

export function PaletteStrip({ colors, maxColors = 8, size = 'sm' }: PaletteStripProps) {
  // Deduplicate by hex and limit
  const seen = new Set<string>()
  const unique: PaletteColor[] = []

  for (const c of colors) {
    const key = c.hex?.toLowerCase() || '__null__'
    if (!seen.has(key) && c.hex) {
      seen.add(key)
      unique.push(c)
      if (unique.length >= maxColors) break
    }
  }

  if (unique.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {unique.map((c, i) => (
        <ColorSwatch key={`${c.hex}-${i}`} hex={c.hex} name={c.name} size={size} />
      ))}
    </div>
  )
}
