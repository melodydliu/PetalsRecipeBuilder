export interface MasterFlowerEntry {
  name: string
  variety: string
  category: 'focal' | 'filler' | 'greenery' | 'textural' | 'tropical'
  color_name: string
  color_hex: string
  unit: 'stem' | 'bunch' | 'box'
  stems_per_bunch: number
  wholesale_cost_per_stem: number
  seasonal_months: number[]  // [] = year-round; [4,5,6] = Apr–Jun
  notes: string
}

export const masterFlowerLibrary: MasterFlowerEntry[] = [
  // ─── FOCAL FLOWERS ────────────────────────────────────────

  // Roses
  { name: 'Garden Rose', variety: 'Juliet', category: 'focal', color_name: 'Blush Apricot', color_hex: '#E8C4B8', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.50, seasonal_months: [4,5,6,7,8,9], notes: 'Order 2 weeks ahead in peak season. Handle carefully — petals bruise easily.' },
  { name: 'Garden Rose', variety: 'David Austin Charity', category: 'focal', color_name: 'Soft Pink', color_hex: '#E8A5B0', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.50, seasonal_months: [4,5,6,7,8,9], notes: 'Cup-shaped blooms. Best in spring and summer.' },
  { name: 'Garden Rose', variety: 'Patience', category: 'focal', color_name: 'Ivory White', color_hex: '#F5F0E8', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.25, seasonal_months: [4,5,6,7,8,9], notes: 'White garden rose with a cream center.' },
  { name: 'Garden Rose', variety: 'Keira', category: 'focal', color_name: 'Pale Pink', color_hex: '#F0D5D5', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.25, seasonal_months: [4,5,6,7,8,9], notes: 'Small cup shape, densely petalled.' },
  { name: 'Spray Rose', variety: 'Lydia', category: 'focal', color_name: 'Peach', color_hex: '#F2C4A0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.80, seasonal_months: [], notes: 'Year-round availability. Multiple blooms per stem.' },
  { name: 'Spray Rose', variety: 'Majolica', category: 'focal', color_name: 'Lavender', color_hex: '#C4B8D8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.75, seasonal_months: [], notes: 'Soft lavender spray rose, consistent year-round supply.' },
  { name: 'Standard Rose', variety: 'Quicksand', category: 'focal', color_name: 'Greige', color_hex: '#C8B4A0', unit: 'bunch', stems_per_bunch: 25, wholesale_cost_per_stem: 0.90, seasonal_months: [], notes: 'Very popular neutral tone. Year-round.' },
  { name: 'Standard Rose', variety: 'White O\'Hara', category: 'focal', color_name: 'White', color_hex: '#FAFAF5', unit: 'bunch', stems_per_bunch: 25, wholesale_cost_per_stem: 0.80, seasonal_months: [], notes: 'Ruffle-petalled, large headed white rose.' },
  { name: 'Standard Rose', variety: 'Black Baccara', category: 'focal', color_name: 'Deep Burgundy', color_hex: '#3D1020', unit: 'bunch', stems_per_bunch: 25, wholesale_cost_per_stem: 1.10, seasonal_months: [], notes: 'Nearly black petal edges, striking in arrangements.' },
  { name: 'Standard Rose', variety: 'Sahara', category: 'focal', color_name: 'Champagne Tan', color_hex: '#C9A87C', unit: 'bunch', stems_per_bunch: 25, wholesale_cost_per_stem: 0.85, seasonal_months: [], notes: 'Antique tan tones, earthy and neutral.' },

  // Peonies
  { name: 'Peony', variety: 'Sarah Bernhardt', category: 'focal', color_name: 'Blush Pink', color_hex: '#EDB8BE', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.00, seasonal_months: [4,5,6], notes: 'Peak April–June. Order weeks ahead. Keep in bud stage for shipping.' },
  { name: 'Peony', variety: 'Coral Charm', category: 'focal', color_name: 'Coral', color_hex: '#E8805A', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.50, seasonal_months: [4,5,6], notes: 'Fades from coral to peachy blush as it opens. Stunning.' },
  { name: 'Peony', variety: 'Dinner Plate', category: 'focal', color_name: 'Hot Pink', color_hex: '#D9507A', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.25, seasonal_months: [4,5,6], notes: 'Very large blooms, high impact.' },
  { name: 'Peony', variety: 'Duchesse de Nemours', category: 'focal', color_name: 'White', color_hex: '#F8F5F0', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.00, seasonal_months: [5,6], notes: 'Classic double white peony, fragrant.' },
  { name: 'Peony', variety: 'Bowl of Beauty', category: 'focal', color_name: 'Pink & Cream', color_hex: '#E8A0B0', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.25, seasonal_months: [4,5,6], notes: 'Japanese anemone-form. Pink outer petals, cream center.' },

  // Ranunculus
  { name: 'Ranunculus', variety: 'Cloni Hanoi', category: 'focal', color_name: 'Apricot', color_hex: '#F0B890', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.80, seasonal_months: [1,2,3,4,10,11,12], notes: 'Cool-season flower. Spring and fall best availability.' },
  { name: 'Ranunculus', variety: 'Elegance Wit', category: 'focal', color_name: 'White', color_hex: '#FAF8F0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.60, seasonal_months: [1,2,3,4,10,11,12], notes: 'Clean white, full petals.' },
  { name: 'Ranunculus', variety: 'Mache', category: 'focal', color_name: 'Burgundy', color_hex: '#6B2030', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.80, seasonal_months: [1,2,3,4,10,11,12], notes: 'Deep wine-colored ranunculus.' },

  // Lisianthus
  { name: 'Lisianthus', variety: 'Echo Blue', category: 'focal', color_name: 'Dusty Purple', color_hex: '#8A7BAA', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.40, seasonal_months: [4,5,6,7,8,9], notes: 'Ruffled, rose-like blooms. Good vase life.' },
  { name: 'Lisianthus', variety: 'Arena White', category: 'focal', color_name: 'White', color_hex: '#F8F8F5', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.30, seasonal_months: [4,5,6,7,8,9], notes: 'Crisp white, double blooms.' },
  { name: 'Lisianthus', variety: 'Rosita Pink', category: 'focal', color_name: 'Blush Pink', color_hex: '#EDAABF', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.35, seasonal_months: [4,5,6,7,8,9], notes: 'Delicate blush with green centers.' },

  // Hydrangea
  { name: 'Hydrangea', variety: 'Jumbo White', category: 'focal', color_name: 'White', color_hex: '#F0EEE8', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 4.00, seasonal_months: [5,6,7,8,9], notes: 'Huge heads. One stem fills substantial volume.' },
  { name: 'Hydrangea', variety: 'Antique Blue', category: 'focal', color_name: 'Dusty Blue', color_hex: '#8BA8C0', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 4.50, seasonal_months: [5,6,7,8,9], notes: 'Antique hydrangea for dried/aged look.' },
  { name: 'Hydrangea', variety: 'Blush Pink', category: 'focal', color_name: 'Blush', color_hex: '#E8C8CC', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 4.00, seasonal_months: [5,6,7,8,9], notes: 'Soft blush mophead hydrangea.' },
  { name: 'Hydrangea', variety: 'Limelight', category: 'focal', color_name: 'Chartreuse', color_hex: '#B8CF6C', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 3.75, seasonal_months: [7,8,9,10], notes: 'Lime green panicle hydrangea. Summer–fall.' },

  // Dahlia
  { name: 'Dahlia', variety: 'Café au Lait', category: 'focal', color_name: 'Blush Caramel', color_hex: '#D4A582', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.50, seasonal_months: [7,8,9,10], notes: 'Hugely popular. Can be variable in color — order extra.' },
  { name: 'Dahlia', variety: 'Black Jack', category: 'focal', color_name: 'Deep Burgundy', color_hex: '#2A1020', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.50, seasonal_months: [7,8,9,10], notes: 'Dark burgundy ball dahlia.' },
  { name: 'Dahlia', variety: 'Apricot Desire', category: 'focal', color_name: 'Apricot', color_hex: '#F2AA7A', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.25, seasonal_months: [7,8,9,10], notes: 'Warm apricot dinner plate dahlia.' },
  { name: 'Dahlia', variety: 'White Onesta', category: 'focal', color_name: 'White', color_hex: '#FFFFF5', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.00, seasonal_months: [7,8,9,10], notes: 'Clean white pompom dahlia.' },

  // Anemone
  { name: 'Anemone', variety: 'Meron White', category: 'focal', color_name: 'White', color_hex: '#F5F3EC', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [1,2,3,4,10,11,12], notes: 'Cool-season. Striking black center. Store cool.' },
  { name: 'Anemone', variety: 'Meron Blue', category: 'focal', color_name: 'Deep Plum', color_hex: '#4A3060', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [1,2,3,4,10,11,12], notes: 'Rich purple with black center.' },

  // Tulip
  { name: 'Tulip', variety: 'White Parrot', category: 'focal', color_name: 'White', color_hex: '#F8F5EC', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [3,4,5], notes: 'Ruffled parrot tulip. Spring only.' },
  { name: 'Tulip', variety: 'Jan Reus', category: 'focal', color_name: 'Deep Red', color_hex: '#8B1A2A', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.80, seasonal_months: [3,4,5], notes: 'Almost black-red single tulip.' },
  { name: 'Tulip', variety: 'La Belle Epoque', category: 'focal', color_name: 'Dusty Peach', color_hex: '#D8A888', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [3,4,5], notes: 'Antique peachy-rose double tulip. Very popular.' },
  { name: 'Tulip', variety: 'Purple Rain', category: 'focal', color_name: 'Deep Purple', color_hex: '#5A3070', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.85, seasonal_months: [3,4,5], notes: 'Deep purple parrot tulip.' },

  // Lily
  { name: 'Oriental Lily', variety: 'Stargazer', category: 'focal', color_name: 'Hot Pink', color_hex: '#D0406A', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [], notes: 'Very fragrant. Allow 3–5 days to open. Remove pollen.' },
  { name: 'Oriental Lily', variety: 'Casa Blanca', category: 'focal', color_name: 'White', color_hex: '#FAFAF8', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [], notes: 'Dramatic pure white with yellow pollen. Very fragrant.' },
  { name: 'Asiatic Lily', variety: 'Tresor', category: 'focal', color_name: 'Yellow', color_hex: '#F0DC6A', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [], notes: 'Upward-facing yellow blooms. Unfragrant.' },
  { name: 'LA Hybrid Lily', variety: 'Brindisi', category: 'focal', color_name: 'Pink', color_hex: '#E888A8', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.10, seasonal_months: [], notes: 'Large upward-facing blooms, no fragrance.' },

  // Orchid
  { name: 'Cymbidium Orchid', variety: 'Standard', category: 'focal', color_name: 'White', color_hex: '#F8F8F5', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 6.00, seasonal_months: [1,2,3,10,11,12], notes: 'Long-lasting. Use individually as accent or en masse.' },
  { name: 'Phalaenopsis Orchid', variety: 'Multiflora', category: 'focal', color_name: 'White', color_hex: '#FDFDFB', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 8.00, seasonal_months: [], notes: 'Multiple blooms per stem, elegant cascading effect.' },
  { name: 'Dendrobium Orchid', variety: 'White Tiger', category: 'focal', color_name: 'White', color_hex: '#F8F8F8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 2.00, seasonal_months: [], notes: 'Spray orchid with multiple small blooms.' },

  // Other focal
  { name: 'Gerbera', variety: 'Jumbo Pink', category: 'focal', color_name: 'Hot Pink', color_hex: '#E85090', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.80, seasonal_months: [], notes: 'Year-round availability.' },
  { name: 'Sunflower', variety: 'ProCut Gold', category: 'focal', color_name: 'Golden Yellow', color_hex: '#F0C020', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [6,7,8,9,10], notes: 'Peak summer. Pollenless variety available.' },
  { name: 'Delphinium', variety: 'Guardian Blue', category: 'focal', color_name: 'Cobalt Blue', color_hex: '#3050A0', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.40, seasonal_months: [4,5,6,7,8,9], notes: 'Tall spikes. Handle gently — blooms bruise.' },
  { name: 'Delphinium', variety: 'White', category: 'focal', color_name: 'White', color_hex: '#F5F5F2', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.40, seasonal_months: [4,5,6,7,8,9], notes: 'Elegant white spike flowers.' },
  { name: 'Snapdragon', variety: 'Chantilly Pink', category: 'focal', color_name: 'Blush', color_hex: '#EDAAB8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [1,2,3,4,5,10,11,12], notes: 'Cool-season. Tight buds open from base up.' },
  { name: 'Iris', variety: 'Blue Magic', category: 'focal', color_name: 'Blue Violet', color_hex: '#5060B0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.70, seasonal_months: [3,4,5], notes: 'Spring availability. Buy tight in bud.' },
  { name: 'Gladiolus', variety: 'Traderhorn', category: 'focal', color_name: 'Red', color_hex: '#CC2030', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [5,6,7,8,9], notes: 'Tall spikes for grand arrangements.' },
  { name: 'Freesia', variety: 'Pink', category: 'focal', color_name: 'Pink', color_hex: '#ECA8B8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [1,2,3,4,5,10,11,12], notes: 'Very fragrant. Cool-season flower.' },
  { name: 'Freesia', variety: 'White', category: 'focal', color_name: 'White', color_hex: '#FAFAF8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [1,2,3,4,5,10,11,12], notes: 'Intensely fragrant white freesia.' },
  { name: 'Stock', variety: 'Pink', category: 'focal', color_name: 'Pink', color_hex: '#E898B0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.10, seasonal_months: [1,2,3,4,5,10,11,12], notes: 'Fragrant. Cool-season. Great filler/focal hybrid.' },
  { name: 'Stock', variety: 'White', category: 'focal', color_name: 'White', color_hex: '#F5F5F0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [1,2,3,4,5,10,11,12], notes: 'White stock is very popular for weddings.' },
  { name: 'Sweet Pea', variety: 'Spencer Mix', category: 'focal', color_name: 'Mixed', color_hex: '#D4A8C8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [3,4,5,6], notes: 'Very delicate. Spring only. Order extra for stems lost.' },
  { name: 'Foxglove', variety: 'Camelot Cream', category: 'focal', color_name: 'Cream', color_hex: '#EDE5CC', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.00, seasonal_months: [4,5,6], notes: 'Cottage garden look. Spring availability.' },
  { name: 'Hellebore', variety: 'Mixed', category: 'focal', color_name: 'Plum', color_hex: '#604060', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.50, seasonal_months: [1,2,3,4], notes: 'Winter/early spring. Allow to sear stem ends immediately.' },
  { name: 'Fritillaria', variety: 'Persica', category: 'focal', color_name: 'Dusty Plum', color_hex: '#7A5880', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 3.00, seasonal_months: [3,4,5], notes: 'Architectural bell clusters. Spring only.' },
  { name: 'Protea', variety: 'King Protea', category: 'focal', color_name: 'Pink', color_hex: '#C87888', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 8.00, seasonal_months: [], notes: 'Year-round from South Africa. Dramatic statement flower.' },
  { name: 'Protea', variety: 'Blushing Bride', category: 'focal', color_name: 'Cream Blush', color_hex: '#F0E0D8', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 5.00, seasonal_months: [], notes: 'Delicate white cone protea.' },
  { name: 'Anthurium', variety: 'Tropical Red', category: 'tropical', color_name: 'Red', color_hex: '#CC2028', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 4.00, seasonal_months: [], notes: 'Tropical, long-lasting. Available year-round.' },
  { name: 'Bird of Paradise', variety: 'Standard', category: 'tropical', color_name: 'Orange', color_hex: '#E86820', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 5.50, seasonal_months: [], notes: 'Dramatic tropical. Fully cut before use.' },
  { name: 'Calla Lily', variety: 'White Giant', category: 'focal', color_name: 'White', color_hex: '#FAFAF5', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.50, seasonal_months: [], notes: 'Elegant and architectural. Year-round.' },
  { name: 'Calla Lily', variety: 'Mini Blush', category: 'focal', color_name: 'Blush', color_hex: '#F0C0C0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [], notes: 'Mini calla, very popular for bouquets.' },
  { name: 'Amaryllis', variety: 'Red Lion', category: 'focal', color_name: 'Red', color_hex: '#CC1820', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 4.50, seasonal_months: [10,11,12,1,2], notes: 'Holiday flower primarily. Support stem with floral wire inside.' },
  { name: 'Clematis', variety: 'Wisley', category: 'focal', color_name: 'Lavender', color_hex: '#B0A0C8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 2.50, seasonal_months: [4,5,6,7,8,9], notes: 'Delicate vining flower. Specialty item.' },
  { name: 'Scabiosa', variety: 'Dove White', category: 'focal', color_name: 'White', color_hex: '#F0EEE8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [4,5,6,7,8,9], notes: 'Pincushion flower with delicate petals.' },
  { name: 'Cosmos', variety: 'Purity White', category: 'focal', color_name: 'White', color_hex: '#FAFCF8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [5,6,7,8,9], notes: 'Delicate summer flower. Order generous extras.' },
  { name: 'Zinnia', variety: 'Queen Lime Orange', category: 'focal', color_name: 'Coral Orange', color_hex: '#F08050', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [6,7,8,9], notes: 'Summer only. Very colorful, good vase life.' },
  { name: 'Celosia', variety: 'Cockscomb Coral', category: 'textural', color_name: 'Coral', color_hex: '#E06848', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [6,7,8,9,10], notes: 'Velvety texture, summer into fall.' },
  { name: 'Celosia', variety: 'Plume Burgundy', category: 'textural', color_name: 'Burgundy', color_hex: '#6B1830', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.40, seasonal_months: [6,7,8,9,10], notes: 'Feathery plume form.' },
  { name: 'Celosia', variety: 'Wheat', category: 'textural', color_name: 'Cream', color_hex: '#E8D8B0', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.30, seasonal_months: [7,8,9,10], notes: 'Flame/wheat celosia, architectural.' },
  { name: 'Allium', variety: 'Gladiator', category: 'focal', color_name: 'Purple', color_hex: '#8060A0', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.00, seasonal_months: [4,5,6], notes: 'Globe allium. Spring. Strong onion scent when cut.' },
  { name: 'Astilbe', variety: 'Fanal Red', category: 'filler', color_name: 'Deep Red', color_hex: '#8B2020', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [5,6,7,8], notes: 'Feathery plumes. Works as focal and filler.' },
  { name: 'Muscari', variety: 'Blue Spike', category: 'focal', color_name: 'Cobalt Blue', color_hex: '#3848A8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.80, seasonal_months: [3,4,5], notes: 'Grape hyacinth. Spring only, short stem.' },
  { name: 'Hyacinth', variety: 'Blue Jacket', category: 'focal', color_name: 'Blue', color_hex: '#5060B8', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [2,3,4], notes: 'Very fragrant. Spring bulb flower. Short stems.' },
  { name: 'Narcissus', variety: 'Jetfire', category: 'focal', color_name: 'Yellow Orange', color_hex: '#F0B840', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.60, seasonal_months: [2,3,4], notes: 'Daffodil family. Toxic to other flowers — condition separately.' },
  { name: 'Poppy', variety: 'Icelandic', category: 'focal', color_name: 'Mixed', color_hex: '#F08060', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.80, seasonal_months: [1,2,3,4,5], notes: 'Sear stem ends immediately. Spring availability.' },
  { name: 'Cornflower', variety: 'Blue Ball', category: 'filler', color_name: 'Cobalt Blue', color_hex: '#3060C0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [4,5,6,7,8], notes: 'Bachelor button. Spring–summer.' },
  { name: 'Liatris', variety: 'Spicata', category: 'textural', color_name: 'Purple', color_hex: '#8040A0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [5,6,7,8,9], notes: 'Vertical spikes. Opens top to bottom.' },
  { name: 'Veronica', variety: 'Destiny Blue', category: 'textural', color_name: 'Purple Blue', color_hex: '#6060B8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [4,5,6,7,8,9], notes: 'Speedwell. Vertical accent.' },
  { name: 'Chrysanthemum', variety: 'Spray Button', category: 'filler', color_name: 'White', color_hex: '#F5F5F0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.70, seasonal_months: [], notes: 'Year-round. Very long vase life.' },
  { name: 'Chrysanthemum', variety: 'Spray Disbud', category: 'focal', color_name: 'Bronze', color_hex: '#A07030', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 0.80, seasonal_months: [9,10,11], notes: 'Fall tones. Disbud for large single bloom.' },
  { name: 'Strawflower', variety: 'Apricot', category: 'textural', color_name: 'Apricot', color_hex: '#E8A878', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [6,7,8,9,10], notes: 'Papery textured petals. Dries beautifully.' },
  { name: 'Marigold', variety: 'Signet', category: 'focal', color_name: 'Gold Orange', color_hex: '#E89020', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.70, seasonal_months: [6,7,8,9], notes: 'Summer annual. Very fragrant.' },

  // ─── FILLER / TEXTURE ──────────────────────────────────────

  { name: 'Waxflower', variety: 'Chinchilla', category: 'filler', color_name: 'White', color_hex: '#F5F5F2', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [1,2,3,4,5,10,11,12], notes: 'Tiny flowers, very popular filler. Cool-season preferred.' },
  { name: 'Waxflower', variety: 'Padparadja', category: 'filler', color_name: 'Pink', color_hex: '#E8A0B0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [1,2,3,4,5,10,11,12], notes: 'Pink waxflower, popular filler.' },
  { name: 'Limonium', variety: 'QIS Blue', category: 'filler', color_name: 'Lavender', color_hex: '#B0A8D0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.50, seasonal_months: [], notes: 'Statice/sea lavender. Year-round. Dries well.' },
  { name: 'Hypericum Berry', variety: 'Magical Red', category: 'filler', color_name: 'Red', color_hex: '#C82030', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.40, seasonal_months: [], notes: 'Berries add texture and color. Year-round.' },
  { name: 'Hypericum Berry', variety: 'Magical White', category: 'filler', color_name: 'Cream White', color_hex: '#F0EDE0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.30, seasonal_months: [], notes: 'White/cream hypericum berries.' },
  { name: 'Coffee Berry', variety: 'Green', category: 'filler', color_name: 'Deep Green', color_hex: '#2A6030', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [7,8,9,10], notes: 'California native. Summer/fall specialty.' },
  { name: 'Queen Anne\'s Lace', variety: 'Ammi Majus', category: 'filler', color_name: 'White', color_hex: '#F8F8F5', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.80, seasonal_months: [4,5,6,7,8,9], notes: 'Delicate lacy clusters. Spring–summer.' },
  { name: 'Solidago', variety: 'Tara Gold', category: 'filler', color_name: 'Golden Yellow', color_hex: '#D8C040', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.60, seasonal_months: [7,8,9,10], notes: 'Goldenrod. Summer–fall. Adds warmth and texture.' },
  { name: 'Trachelium', variety: 'Devotion White', category: 'filler', color_name: 'White', color_hex: '#F0F0EE', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.90, seasonal_months: [4,5,6,7,8,9], notes: 'Tiny cluster flowers. Good filler.' },
  { name: 'Astrantia', variety: 'Star of Billion', category: 'filler', color_name: 'Blush White', color_hex: '#F0E0DC', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.00, seasonal_months: [4,5,6,7], notes: 'Specialty item. Pincushion-like blooms.' },
  { name: 'Nigella', variety: 'Love in a Mist', category: 'filler', color_name: 'Blue', color_hex: '#7080B8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [4,5,6,7], notes: 'Feathery bracts around small flower. Spring.' },
  { name: 'Bupleurum', variety: 'Rotundifolium', category: 'filler', color_name: 'Chartreuse', color_hex: '#A8C860', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.70, seasonal_months: [4,5,6,7,8,9], notes: 'Lime green filler. Good for adding lightness.' },
  { name: 'Genista', variety: 'Yellow Broom', category: 'filler', color_name: 'Yellow', color_hex: '#E8D850', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [3,4,5], notes: 'Flowering broom. Spring accent.' },
  { name: 'Craspedia', variety: 'Billy Balls', category: 'textural', color_name: 'Yellow', color_hex: '#F0D030', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.10, seasonal_months: [], notes: 'Round globe flowers on long stems. Year-round.' },
  { name: 'Eryngium', variety: 'Arctic Blue', category: 'textural', color_name: 'Steel Blue', color_hex: '#6090A8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.30, seasonal_months: [5,6,7,8,9,10], notes: 'Sea holly thistle. Architectural texture.' },
  { name: 'Yarrow', variety: 'Gold Plate', category: 'filler', color_name: 'Golden Yellow', color_hex: '#E8C040', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.80, seasonal_months: [5,6,7,8,9], notes: 'Achillea. Flat-topped clusters. Dries well.' },
  { name: 'Oxypetalum', variety: 'Tweedia', category: 'filler', color_name: 'Sky Blue', color_hex: '#80B0D8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [4,5,6,7,8,9], notes: 'True blue star-shaped flowers. Specialty.' },
  { name: 'Campanula', variety: 'Champion Blue', category: 'filler', color_name: 'Periwinkle', color_hex: '#8898D0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [4,5,6,7,8,9], notes: 'Bell-shaped blue flowers on arching stems.' },
  { name: 'Statice', variety: 'QIS Purple', category: 'filler', color_name: 'Purple', color_hex: '#8060A8', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.50, seasonal_months: [], notes: 'Everlasting. Dries in arrangement. Year-round.' },
  { name: 'Pittosporum Berry', variety: 'Variegated', category: 'filler', color_name: 'Green White', color_hex: '#C8D8C0', unit: 'bunch', stems_per_bunch: 5, wholesale_cost_per_stem: 1.50, seasonal_months: [], notes: 'Berried stems with variegated foliage.' },

  // ─── GREENERY / FOLIAGE ────────────────────────────────────

  { name: 'Eucalyptus', variety: 'Seeded', category: 'greenery', color_name: 'Silver Green', color_hex: '#8EA890', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [], notes: 'Year-round staple. Slight fragrance. Very popular.' },
  { name: 'Eucalyptus', variety: 'Silver Dollar', category: 'greenery', color_name: 'Silver Blue', color_hex: '#9AACB0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.10, seasonal_months: [], notes: 'Round leaves. Year-round.' },
  { name: 'Eucalyptus', variety: 'Gunni', category: 'greenery', color_name: 'Sage Green', color_hex: '#8AA890', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.10, seasonal_months: [], notes: 'Small rounded leaves. Very popular year-round.' },
  { name: 'Eucalyptus', variety: 'Willow', category: 'greenery', color_name: 'Sage Green', color_hex: '#7A9880', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.30, seasonal_months: [], notes: 'Long trailing stems. Great for draping.' },
  { name: 'Eucalyptus', variety: 'Spiral', category: 'greenery', color_name: 'Deep Green', color_hex: '#4A7060', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.40, seasonal_months: [], notes: 'Spiral/parvifolia eucalyptus. Dense texture.' },
  { name: 'Ruscus', variety: 'Israeli', category: 'greenery', color_name: 'Deep Green', color_hex: '#2A5030', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.80, seasonal_months: [], notes: 'Long-lasting foliage. Industry staple.' },
  { name: 'Ruscus', variety: 'Italian', category: 'greenery', color_name: 'Green', color_hex: '#3A6840', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.70, seasonal_months: [], notes: 'Flatter, wider leaves than Israeli.' },
  { name: 'Salal', variety: 'Lemon Leaf', category: 'greenery', color_name: 'Glossy Green', color_hex: '#3A6030', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.60, seasonal_months: [], notes: 'Glossy round leaves. Classic wedding greenery.' },
  { name: 'Fern', variety: 'Leatherleaf', category: 'greenery', color_name: 'Forest Green', color_hex: '#2A5028', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.40, seasonal_months: [], notes: 'Classic filler fern. Budget-friendly.' },
  { name: 'Fern', variety: 'Sword Fern', category: 'greenery', color_name: 'Medium Green', color_hex: '#3A6838', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 0.60, seasonal_months: [], notes: 'Arching fronds. Great for large arrangements.' },
  { name: 'Myrtle', variety: 'Italian', category: 'greenery', color_name: 'Dark Green', color_hex: '#2A4830', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [], notes: 'Fragrant. Traditional for bridal bouquets.' },
  { name: 'Olive Branch', variety: 'Standard', category: 'greenery', color_name: 'Olive Green', color_hex: '#7A8848', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 2.50, seasonal_months: [], notes: 'Mediterranean greenery. Year-round from specialty farms.' },
  { name: 'Rosemary', variety: 'Upright', category: 'greenery', color_name: 'Gray Green', color_hex: '#7A9070', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.80, seasonal_months: [], notes: 'Fragrant herb greenery. Popular for natural/garden style.' },
  { name: 'Dusty Miller', variety: 'Florist Grade', category: 'greenery', color_name: 'Silver', color_hex: '#B8C0B0', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.70, seasonal_months: [], notes: 'Silver-white foliage. Popular for weddings.' },
  { name: 'Pittosporum', variety: 'Green Ball', category: 'greenery', color_name: 'Deep Green', color_hex: '#2A4A20', unit: 'bunch', stems_per_bunch: 5, wholesale_cost_per_stem: 1.30, seasonal_months: [], notes: 'Dense round foliage. Very popular.' },
  { name: 'Monstera Leaf', variety: 'Deliciosa', category: 'tropical', color_name: 'Deep Green', color_hex: '#1A4020', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 3.50, seasonal_months: [], notes: 'Tropical statement leaf. Year-round.' },
  { name: 'Palm Leaf', variety: 'Parlor', category: 'tropical', color_name: 'Medium Green', color_hex: '#2A5030', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 2.00, seasonal_months: [], notes: 'Tropical foliage. Good for dramatic arrangements.' },
  { name: 'Ti Leaf', variety: 'Green', category: 'tropical', color_name: 'Deep Green', color_hex: '#1A4818', unit: 'bunch', stems_per_bunch: 5, wholesale_cost_per_stem: 1.50, seasonal_months: [], notes: 'Long strap-leaf. Tropical arrangements.' },
  { name: 'Galax', variety: 'Heart Leaf', category: 'greenery', color_name: 'Deep Green', color_hex: '#204028', unit: 'bunch', stems_per_bunch: 25, wholesale_cost_per_stem: 0.20, seasonal_months: [], notes: 'Small round leaves for bouquet collars and surface coverage.' },
  { name: 'Hosta', variety: 'Green', category: 'greenery', color_name: 'Green', color_hex: '#3A6838', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.00, seasonal_months: [4,5,6,7,8,9], notes: 'Large garden leaves. Spring–fall.' },
  { name: 'Magnolia Leaf', variety: 'Preserved', category: 'greenery', color_name: 'Bronze Brown', color_hex: '#8A6840', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 1.20, seasonal_months: [], notes: 'Preserved magnolia leaves. Rich brown underside, year-round.' },
  { name: 'Ivy', variety: 'English', category: 'greenery', color_name: 'Deep Green', color_hex: '#2A5828', unit: 'bunch', stems_per_bunch: 10, wholesale_cost_per_stem: 0.60, seasonal_months: [], notes: 'Classic cascading greenery. Year-round.' },
  { name: 'Variegated Pittosporum', variety: 'Silver Edge', category: 'greenery', color_name: 'Green White', color_hex: '#C0D0B8', unit: 'bunch', stems_per_bunch: 5, wholesale_cost_per_stem: 1.40, seasonal_months: [], notes: 'Variegated foliage adds lightness.' },

  // ─── BRANCHES / SEASONAL ──────────────────────────────────

  { name: 'Cherry Blossom', variety: 'Yoshino', category: 'focal', color_name: 'Blush Pink', color_hex: '#F0D0D8', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 5.00, seasonal_months: [2,3,4], notes: 'Very short window. Order weeks ahead. Forced branches available.' },
  { name: 'Quince Branch', variety: 'Forced', category: 'focal', color_name: 'Pink', color_hex: '#F0A8B8', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 4.00, seasonal_months: [1,2,3], notes: 'Forced early spring branches. Very dramatic.' },
  { name: 'Curly Willow', variety: 'Standard', category: 'textural', color_name: 'Tan Brown', color_hex: '#B8A080', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 2.50, seasonal_months: [], notes: 'Year-round. Adds architectural drama.' },
  { name: 'Birch Branch', variety: 'White', category: 'textural', color_name: 'White Tan', color_hex: '#E8E0D0', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 3.00, seasonal_months: [10,11,12,1,2,3], notes: 'White bark. Good for winter/holiday arrangements.' },
  { name: 'Cotton Branch', variety: 'Standard', category: 'textural', color_name: 'White', color_hex: '#F8F5EE', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 2.00, seasonal_months: [8,9,10,11,12], notes: 'Fall/winter specialty. Natural dried cotton bolls.' },
  { name: 'Ilex Berry', variety: 'Holly Red', category: 'filler', color_name: 'Red', color_hex: '#CC2020', unit: 'stem', stems_per_bunch: 10, wholesale_cost_per_stem: 1.50, seasonal_months: [11,12], notes: 'Holiday season only. Classic Christmas greenery.' },
  { name: 'Oak Leaf', variety: 'Preserved', category: 'greenery', color_name: 'Rust Brown', color_hex: '#8A5028', unit: 'bunch', stems_per_bunch: 5, wholesale_cost_per_stem: 1.50, seasonal_months: [8,9,10,11], notes: 'Fall arrangements. Preserved for year-round use.' },
  { name: 'Dogwood Branch', variety: 'Flowering', category: 'focal', color_name: 'White', color_hex: '#F5F5EE', unit: 'stem', stems_per_bunch: 5, wholesale_cost_per_stem: 4.50, seasonal_months: [3,4,5], notes: 'Spring branches. Very dramatic for ceremony arches.' },
]

export default masterFlowerLibrary
