// ─── Recipe / Event Type Options ────────────────────────────
// Single source of truth for event types used across the app.

export const EVENT_TYPE_OPTIONS = [
  { value: 'bridal_bouquet',       label: 'Bridal Bouquet' },
  { value: 'bridesmaid_bouquet',   label: 'Bridesmaid Bouquet' },
  { value: 'toss_bouquet',         label: 'Toss Bouquet' },
  { value: 'boutonniere',          label: 'Boutonniere' },
  { value: 'corsage',              label: 'Corsage' },
  { value: 'centerpiece_low',      label: 'Low Centerpiece' },
  { value: 'centerpiece_tall',     label: 'Tall Centerpiece' },
  { value: 'ceremony_arch',        label: 'Ceremony Arch' },
  { value: 'altar_arrangement',    label: 'Altar Arrangement' },
  { value: 'aisle_arrangement',    label: 'Aisle Arrangement' },
  { value: 'pew_marker',           label: 'Pew Marker' },
  { value: 'ceremony_backdrop',    label: 'Ceremony Backdrop' },
  { value: 'welcome_arrangement',  label: 'Welcome Arrangement' },
  { value: 'cocktail_arrangement', label: 'Cocktail Arrangement' },
  { value: 'sweetheart_table',     label: 'Sweetheart Table' },
  { value: 'cake_flowers',         label: 'Cake Flowers' },
  { value: 'reception_table',      label: 'Reception Table' },
  { value: 'hanging_installation', label: 'Hanging Installation' },
  { value: 'bud_vase_cluster',     label: 'Bud Vase Cluster' },
  { value: 'bar_arrangement',      label: 'Bar Arrangement' },
  { value: 'other',                label: 'Other' },
] as const

/** Lookup map derived from EVENT_TYPE_OPTIONS — for display in read-only contexts. */
export const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map(o => [o.value, o.label])
)
