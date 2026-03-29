import type { LaborMode, RecipeItemType, FeeType } from '@/types/database'

export type { FeeType }

export interface PricingSettings {
  flowerMarkup: number       // e.g. 3.5
  hardGoodsMarkup: number    // e.g. 2.5
  rentalMarkup: number       // e.g. 2.5
  laborMode: LaborMode
  designFeePct: number       // e.g. 30 (as percentage, not decimal)
  prepHours: number
  prepRate: number
  designHours: number
  designRate: number
  deliveryFee: number
  setupFee: number
  teardownFee: number
  deliveryFeeType: FeeType
  setupFeeType: FeeType
  teardownFeeType: FeeType
  taxRate: number            // e.g. 8.5 (as percentage, not decimal)
  marginTarget: number       // e.g. 70 (as percentage)
}

export interface RecipeLineItem {
  id: string
  itemType: RecipeItemType
  itemName: string
  itemVariety: string | null
  itemColorName: string | null
  itemColorHex: string | null
  itemUnit: string | null
  itemImageUrl: string | null
  wholesaleCostSnapshot: number
  quantity: number
  notes: string | null
  sortOrder: number
}

export interface MaterialsCOGS {
  flowersCOGS: number
  hardGoodsCOGS: number
  rentalsCOGS: number
  miscCOGS: number
  totalCOGS: number
}

export interface MarkedUpMaterials {
  flowersMarkedUp: number
  hardGoodsMarkedUp: number
  rentalsMarkedUp: number
  miscMarkedUp: number
  markedUpSubtotal: number
}

export interface LaborBreakdown {
  laborMode: LaborMode
  designFee: number       // if percentage mode
  prepLaborCost: number   // if hourly mode
  designLaborCost: number // if hourly mode
  totalLabor: number
}

export interface ServicesFees {
  deliveryFee: number
  setupFee: number
  teardownFee: number
  servicesTotal: number
}

export interface PricingWaterfall {
  materials: MaterialsCOGS
  markedUp: MarkedUpMaterials
  labor: LaborBreakdown
  recipeSubtotal: number   // markedUpSubtotal + totalLabor
  services: ServicesFees
  preTaxTotal: number
  taxAmount: number
  totalRetailPrice: number
  // Profit analysis
  cogsAsPctOfRetail: number
  laborAsPctOfRetail: number
  grossProfit: number
  grossMarginPct: number
  marginHealth: 'green' | 'yellow' | 'red'
}

export interface WorkBackResult {
  targetRetail: number
  availableForMaterials: number  // what you can spend on wholesale
  availablePerStem: number       // avg available per stem
  totalStems: number
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  flowerMarkup: 3.5,
  hardGoodsMarkup: 2.5,
  rentalMarkup: 2.5,
  laborMode: 'percentage',
  designFeePct: 30,
  prepHours: 0,
  prepRate: 35,
  designHours: 0,
  designRate: 65,
  deliveryFee: 150,
  setupFee: 200,
  teardownFee: 100,
  deliveryFeeType: 'flat',
  setupFeeType: 'flat',
  teardownFeeType: 'flat',
  taxRate: 0,
  marginTarget: 70,
}
