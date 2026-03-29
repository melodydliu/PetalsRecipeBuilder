/**
 * Petal Pricing Engine
 * All pricing logic as pure, typed, unit-testable functions.
 * This is the single source of truth for all pricing calculations.
 */

import type {
  PricingSettings,
  RecipeLineItem,
  MaterialsCOGS,
  MarkedUpMaterials,
  LaborBreakdown,
  ServicesFees,
  PricingWaterfall,
  WorkBackResult,
  FeeType,
} from './types'

// ─── MATERIALS (COGS) ───────────────────────────────────────

export function calculateMaterialsCOGS(items: RecipeLineItem[]): MaterialsCOGS {
  let flowersCOGS = 0
  let hardGoodsCOGS = 0
  let rentalsCOGS = 0
  let miscCOGS = 0

  for (const item of items) {
    const lineCost = item.wholesaleCostSnapshot * item.quantity
    switch (item.itemType) {
      case 'flower':    flowersCOGS += lineCost; break
      case 'hard_good': hardGoodsCOGS += lineCost; break
      case 'rental':    rentalsCOGS += lineCost; break
      case 'misc':      miscCOGS += lineCost; break
    }
  }

  return {
    flowersCOGS,
    hardGoodsCOGS,
    rentalsCOGS,
    miscCOGS,
    totalCOGS: flowersCOGS + hardGoodsCOGS + rentalsCOGS + miscCOGS,
  }
}

// ─── MARKED-UP MATERIALS ────────────────────────────────────

export function calculateMarkedUpMaterials(
  cogs: MaterialsCOGS,
  settings: Pick<PricingSettings, 'flowerMarkup' | 'hardGoodsMarkup' | 'rentalMarkup'>
): MarkedUpMaterials {
  const flowersMarkedUp = cogs.flowersCOGS * settings.flowerMarkup
  const hardGoodsMarkedUp = cogs.hardGoodsCOGS * settings.hardGoodsMarkup
  const rentalsMarkedUp = cogs.rentalsCOGS * settings.rentalMarkup
  const miscMarkedUp = cogs.miscCOGS  // misc items: no additional markup applied

  return {
    flowersMarkedUp,
    hardGoodsMarkedUp,
    rentalsMarkedUp,
    miscMarkedUp,
    markedUpSubtotal: flowersMarkedUp + hardGoodsMarkedUp + rentalsMarkedUp + miscMarkedUp,
  }
}

// ─── LABOR ──────────────────────────────────────────────────

export function calculateLabor(
  markedUpSubtotal: number,
  settings: Pick<
    PricingSettings,
    'laborMode' | 'designFeePct' | 'prepHours' | 'prepRate' | 'designHours' | 'designRate'
  >
): LaborBreakdown {
  if (settings.laborMode === 'percentage') {
    const designFee = markedUpSubtotal * (settings.designFeePct / 100)
    return {
      laborMode: 'percentage',
      designFee,
      prepLaborCost: 0,
      designLaborCost: 0,
      totalLabor: designFee,
    }
  } else {
    const prepLaborCost = settings.prepHours * settings.prepRate
    const designLaborCost = settings.designHours * settings.designRate
    return {
      laborMode: 'hourly',
      designFee: 0,
      prepLaborCost,
      designLaborCost,
      totalLabor: prepLaborCost + designLaborCost,
    }
  }
}

// ─── SERVICES FEES ──────────────────────────────────────────

export function calculateServicesFees(
  settings: Pick<PricingSettings, 'deliveryFee' | 'setupFee' | 'teardownFee' | 'deliveryFeeType' | 'setupFeeType' | 'teardownFeeType'>,
  recipesSubtotal = 0
): ServicesFees {
  const fee = (value: number, type: FeeType) =>
    type === 'percentage' ? (value / 100) * recipesSubtotal : value
  const deliveryFee = fee(settings.deliveryFee, settings.deliveryFeeType)
  const setupFee = fee(settings.setupFee, settings.setupFeeType)
  const teardownFee = fee(settings.teardownFee, settings.teardownFeeType)
  return {
    deliveryFee,
    setupFee,
    teardownFee,
    servicesTotal: deliveryFee + setupFee + teardownFee,
  }
}

// ─── MARGIN HEALTH ──────────────────────────────────────────

export function calculateMarginHealth(
  grossMarginPct: number,
  marginTarget: number
): 'green' | 'yellow' | 'red' {
  if (grossMarginPct >= marginTarget) return 'green'
  if (grossMarginPct >= marginTarget - 5) return 'yellow'
  return 'red'
}

// ─── FULL WATERFALL ─────────────────────────────────────────

export function calculatePricingWaterfall(
  items: RecipeLineItem[],
  settings: PricingSettings
): PricingWaterfall {
  const materials = calculateMaterialsCOGS(items)
  const markedUp = calculateMarkedUpMaterials(materials, settings)
  const labor = calculateLabor(markedUp.markedUpSubtotal, settings)
  const recipeSubtotal = markedUp.markedUpSubtotal + labor.totalLabor
  const services = calculateServicesFees(settings, recipeSubtotal)
  const preTaxTotal = recipeSubtotal + services.servicesTotal
  const taxAmount = preTaxTotal * (settings.taxRate / 100)
  const totalRetailPrice = preTaxTotal + taxAmount

  const cogsAsPctOfRetail = totalRetailPrice > 0
    ? (materials.totalCOGS / totalRetailPrice) * 100
    : 0
  const laborAsPctOfRetail = totalRetailPrice > 0
    ? (labor.totalLabor / totalRetailPrice) * 100
    : 0
  const grossProfit = totalRetailPrice - materials.totalCOGS
  const grossMarginPct = totalRetailPrice > 0
    ? (grossProfit / totalRetailPrice) * 100
    : 0

  return {
    materials,
    markedUp,
    labor,
    recipeSubtotal,
    services,
    preTaxTotal,
    taxAmount,
    totalRetailPrice,
    cogsAsPctOfRetail,
    laborAsPctOfRetail,
    grossProfit,
    grossMarginPct,
    marginHealth: calculateMarginHealth(grossMarginPct, settings.marginTarget),
  }
}

// ─── WORK-BACK MODE ─────────────────────────────────────────

/**
 * Given a target retail price, calculate how much can be spent on wholesale materials.
 * Works backwards through the pricing waterfall.
 */
export function calculateWorkBack(
  targetRetail: number,
  items: RecipeLineItem[],
  settings: PricingSettings
): WorkBackResult {
  // Total stems (flower items only)
  const totalStems = items
    .filter(i => i.itemType === 'flower')
    .reduce((sum, i) => sum + i.quantity, 0)

  // Services fees don't change
  const services = calculateServicesFees(settings)

  // Pre-tax total after removing services
  const preTaxBeforeServices = targetRetail / (1 + settings.taxRate / 100)
  const recipeSubtotal = preTaxBeforeServices - services.servicesTotal

  // Now: recipeSubtotal = markedUpSubtotal + labor
  // If labor mode is percentage: labor = markedUpSubtotal * (designFeePct/100)
  // So: recipeSubtotal = markedUpSubtotal * (1 + designFeePct/100)
  // → markedUpSubtotal = recipeSubtotal / (1 + designFeePct/100)

  let availableMarkedUp: number
  if (settings.laborMode === 'percentage') {
    availableMarkedUp = recipeSubtotal / (1 + settings.designFeePct / 100)
  } else {
    // Hourly: labor is fixed cost
    const fixedLabor = settings.prepHours * settings.prepRate + settings.designHours * settings.designRate
    availableMarkedUp = recipeSubtotal - fixedLabor
  }

  // Subtract already-committed non-flower costs from the available marked-up budget,
  // then back-calculate the COGS budget remaining for flowers.
  const hardGoodsCOGS = items
    .filter(i => i.itemType === 'hard_good')
    .reduce((sum, i) => sum + i.wholesaleCostSnapshot * i.quantity, 0)
  const rentalsCOGS = items
    .filter(i => i.itemType === 'rental' || i.itemType === 'misc')
    .reduce((sum, i) => sum + i.wholesaleCostSnapshot * i.quantity, 0)
  const committedNonFlowerMarkedUp =
    hardGoodsCOGS * settings.hardGoodsMarkup +
    rentalsCOGS * settings.rentalMarkup

  const availableForFlowerMarkedUp = Math.max(0, availableMarkedUp - committedNonFlowerMarkedUp)
  const availableForMaterials = availableForFlowerMarkedUp / settings.flowerMarkup
  const availablePerStem = totalStems > 0 ? availableForMaterials / totalStems : 0

  return {
    targetRetail,
    availableForMaterials: Math.max(0, availableForMaterials),
    availablePerStem: Math.max(0, availablePerStem),
    totalStems,
  }
}

// ─── BUNCH ROUNDING (for order generator) ──────────────────

export function calculateBunchesNeeded(
  stemsNeeded: number,
  stemsPerBunch: number,
  wasteBufferPct: number
): { stemsWithBuffer: number; bunchesNeeded: number } {
  const stemsWithBuffer = Math.ceil(stemsNeeded * (1 + wasteBufferPct / 100))
  const bunchesNeeded = Math.ceil(stemsWithBuffer / stemsPerBunch)
  return { stemsWithBuffer, bunchesNeeded }
}

// ─── SEASONAL CHECK ─────────────────────────────────────────

export function isFlowerInSeason(
  seasonalMonths: number[],
  month: number  // 1-12
): boolean {
  if (seasonalMonths.length === 0) return true  // year-round
  return seasonalMonths.includes(month)
}

// ─── EVENT SUMMARY AGGREGATION ──────────────────────────────

export interface EventPricingSettings {
  deliveryFee: number
  setupFee: number
  teardownFee: number
  deliveryFeeType: FeeType
  setupFeeType: FeeType
  teardownFeeType: FeeType
  taxRate: number
  marginTarget: number
  // Used to mark up event-level items (hard goods / rentals)
  // Falls back to studio defaults (2.5×) if omitted
  hardGoodsMarkup?: number
  rentalMarkup?: number
}

export interface EventItemEntry {
  itemType: 'hard_good' | 'rental' | 'misc'
  wholesaleCostSnapshot: number
  quantity: number
}

export interface EventSummary {
  totalCOGS: number
  totalLabor: number
  recipesSubtotal: number
  eventItemsCOGS: number
  eventItemsSubtotal: number
  deliveryFee: number
  setupFee: number
  teardownFee: number
  servicesTotal: number
  preTaxTotal: number
  taxAmount: number
  totalRetailPrice: number
  cogsAsPctOfRetail: number
  laborAsPctOfRetail: number
  grossProfit: number
  blendedMarginPct: number
  marginHealth: 'green' | 'yellow' | 'red'
  totalStems: number
}

export interface EventRecipeEntry {
  items: RecipeLineItem[]
  settings: PricingSettings
  quantity: number
  overrideRetailPrice?: number | null
}

export function calculateEventSummary(
  recipeEntries: EventRecipeEntry[],
  eventSettings: EventPricingSettings,
  eventItems: EventItemEntry[] = []
): EventSummary {
  let totalCOGS = 0
  let totalLabor = 0
  let recipesSubtotal = 0
  let totalStems = 0

  for (const entry of recipeEntries) {
    // Calculate each recipe's waterfall without services/tax (those are event-level)
    const waterfall = calculatePricingWaterfall(entry.items, {
      ...entry.settings,
      deliveryFee: 0,
      setupFee: 0,
      teardownFee: 0,
      taxRate: 0,
    })
    const qty = entry.quantity
    const recipeSubtotal = entry.overrideRetailPrice ?? waterfall.recipeSubtotal

    totalCOGS += waterfall.materials.totalCOGS * qty
    totalLabor += waterfall.labor.totalLabor * qty
    recipesSubtotal += recipeSubtotal * qty
    totalStems += entry.items
      .filter(i => i.itemType === 'flower')
      .reduce((sum, i) => sum + i.quantity, 0) * qty
  }

  // Event-level items (hard goods / rentals / misc not tied to any recipe)
  const hardGoodsMarkup = eventSettings.hardGoodsMarkup ?? 2.5
  const rentalMarkup = eventSettings.rentalMarkup ?? 2.5
  let eventItemsCOGS = 0
  let eventItemsSubtotal = 0

  for (const item of eventItems) {
    const cogs = item.wholesaleCostSnapshot * item.quantity
    eventItemsCOGS += cogs
    let markup = 1
    if (item.itemType === 'hard_good') markup = hardGoodsMarkup
    else if (item.itemType === 'rental') markup = rentalMarkup
    // misc: no markup (consistent with recipe-level misc items)
    eventItemsSubtotal += cogs * markup
  }

  totalCOGS += eventItemsCOGS

  const { taxRate, marginTarget } = eventSettings
  const applyFeeType = (value: number, type: FeeType) =>
    type === 'percentage' ? (value / 100) * recipesSubtotal : value
  const deliveryFee = applyFeeType(eventSettings.deliveryFee, eventSettings.deliveryFeeType)
  const setupFee = applyFeeType(eventSettings.setupFee, eventSettings.setupFeeType)
  const teardownFee = applyFeeType(eventSettings.teardownFee, eventSettings.teardownFeeType)
  const servicesTotal = deliveryFee + setupFee + teardownFee
  const preTaxTotal = recipesSubtotal + eventItemsSubtotal + servicesTotal
  const taxAmount = preTaxTotal * (taxRate / 100)
  const totalRetailPrice = preTaxTotal + taxAmount

  const cogsAsPctOfRetail = totalRetailPrice > 0 ? (totalCOGS / totalRetailPrice) * 100 : 0
  const laborAsPctOfRetail = totalRetailPrice > 0 ? (totalLabor / totalRetailPrice) * 100 : 0
  const grossProfit = totalRetailPrice - totalCOGS
  const blendedMarginPct = totalRetailPrice > 0 ? (grossProfit / totalRetailPrice) * 100 : 0

  return {
    totalCOGS,
    totalLabor,
    recipesSubtotal,
    eventItemsCOGS,
    eventItemsSubtotal,
    deliveryFee,
    setupFee,
    teardownFee,
    servicesTotal,
    preTaxTotal,
    taxAmount,
    totalRetailPrice,
    cogsAsPctOfRetail,
    laborAsPctOfRetail,
    grossProfit,
    blendedMarginPct,
    marginHealth: calculateMarginHealth(blendedMarginPct, marginTarget),
    totalStems,
  }
}

// ─── FORMATTING HELPERS ─────────────────────────────────────
// Re-exported from lib/utils — single source of truth
export { formatCurrency, formatPct } from '@/lib/utils'
