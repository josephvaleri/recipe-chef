export interface ParsedAmount {
  quantity: number
  unit: string
  original: string
}

export const UNIT_CONVERSIONS = {
  // Volume
  'cup': { ml: 240, oz: 8.115 },
  'cups': { ml: 240, oz: 8.115 },
  'c': { ml: 240, oz: 8.115 },
  'tablespoon': { ml: 15, oz: 0.5 },
  'tbsp': { ml: 15, oz: 0.5 },
  'tablespoons': { ml: 15, oz: 0.5 },
  'teaspoon': { ml: 5, oz: 0.167 },
  'tsp': { ml: 5, oz: 0.167 },
  'teaspoons': { ml: 5, oz: 0.167 },
  'pint': { ml: 480, oz: 16.23 },
  'pt': { ml: 480, oz: 16.23 },
  'quart': { ml: 960, oz: 32.46 },
  'qt': { ml: 960, oz: 32.46 },
  'gallon': { ml: 3840, oz: 129.84 },
  'gal': { ml: 3840, oz: 129.84 },
  'liter': { ml: 1000, oz: 33.81 },
  'l': { ml: 1000, oz: 33.81 },
  'milliliter': { ml: 1, oz: 0.034 },
  'ml': { ml: 1, oz: 0.034 },
  'fluid ounce': { ml: 30, oz: 1 },
  'fl oz': { ml: 30, oz: 1 },
  
  // Weight
  'pound': { g: 454, oz: 16 },
  'lb': { g: 454, oz: 16 },
  'lbs': { g: 454, oz: 16 },
  'ounce': { g: 28.35, oz: 1 },
  'oz': { g: 28.35, oz: 1 },
  'gram': { g: 1, oz: 0.035 },
  'g': { g: 1, oz: 0.035 },
  'kilogram': { g: 1000, oz: 35.27 },
  'kg': { g: 1000, oz: 35.27 },
  
  // Count
  'piece': { count: 1 },
  'pieces': { count: 1 },
  'whole': { count: 1 },
  'each': { count: 1 },
  'dozen': { count: 12 },
  'dz': { count: 12 },
} as const

export function parseAmount(amount: string): ParsedAmount | null {
  if (!amount || typeof amount !== 'string') return null
  
  const cleanAmount = amount.trim().toLowerCase()
  
  // Match patterns like "2 cups", "1/2 cup", "1.5 tbsp", etc.
  const match = cleanAmount.match(/^(\d+(?:\.\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)\s*([a-zA-Z]+.*?)?$/)
  
  if (!match) return null
  
  let quantity = 0
  const quantityStr = match[1]
  
  if (quantityStr.includes('/')) {
    // Handle fractions
    const parts = quantityStr.split(/\s+/)
    if (parts.length === 2) {
      // Mixed number like "1 1/2"
      const whole = parseFloat(parts[0])
      const [num, den] = parts[1].split('/').map(Number)
      quantity = whole + (num / den)
    } else {
      // Simple fraction like "1/2"
      const [num, den] = quantityStr.split('/').map(Number)
      quantity = num / den
    }
  } else {
    quantity = parseFloat(quantityStr)
  }
  
  const unit = match[2]?.trim() || ''
  
  return {
    quantity,
    unit,
    original: amount
  }
}

export function scaleAmount(amount: string, factor: number): string {
  const parsed = parseAmount(amount)
  if (!parsed) return amount
  
  const scaledQuantity = Math.round(parsed.quantity * factor * 100) / 100
  
  // Handle common fraction conversions
  if (scaledQuantity < 1 && scaledQuantity > 0) {
    const fraction = decimalToFraction(scaledQuantity)
    if (fraction) {
      return `${fraction} ${parsed.unit}`
    }
  }
  
  return `${scaledQuantity} ${parsed.unit}`
}

export function convertUnit(amount: string, targetUnit: string): string | null {
  const parsed = parseAmount(amount)
  if (!parsed) return null
  
  const conversions = UNIT_CONVERSIONS[parsed.unit.toLowerCase() as keyof typeof UNIT_CONVERSIONS]
  if (!conversions) return null
  
  const targetConversions = UNIT_CONVERSIONS[targetUnit.toLowerCase() as keyof typeof UNIT_CONVERSIONS]
  if (!targetConversions) return null
  
  // Find common base unit
  let convertedQuantity = parsed.quantity
  
  if ((conversions as any).ml && (targetConversions as any).ml) {
    // Volume conversion
    convertedQuantity = (parsed.quantity * (conversions as any).ml) / (targetConversions as any).ml
  } else if ((conversions as any).g && (targetConversions as any).g) {
    // Weight conversion
    convertedQuantity = (parsed.quantity * (conversions as any).g) / (targetConversions as any).g
  } else if ((conversions as any).oz && (targetConversions as any).oz) {
    // Common oz conversion
    convertedQuantity = (parsed.quantity * (conversions as any).oz) / (targetConversions as any).oz
  } else {
    return null
  }
  
  const rounded = Math.round(convertedQuantity * 100) / 100
  return `${rounded} ${targetUnit}`
}

function decimalToFraction(decimal: number): string | null {
  const tolerance = 1e-6
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1
  let b = decimal
  
  do {
    let a = Math.floor(b)
    let aux = h1
    h1 = a * h1 + h2
    h2 = aux
    aux = k1
    k1 = a * k1 + k2
    k2 = aux
    b = 1 / (b - a)
  } while (Math.abs(decimal - h1 / k1) > decimal * tolerance)
  
  if (k1 === 1) return `${h1}`
  if (h1 === 1) return `1/${k1}`
  return `${h1}/${k1}`
}

export function isVolumeUnit(unit: string): boolean {
  const volumeUnits = ['cup', 'cups', 'tablespoon', 'tbsp', 'tablespoons', 'teaspoon', 'tsp', 'teaspoons', 
                      'pint', 'pt', 'quart', 'qt', 'gallon', 'gal', 'liter', 'l', 'milliliter', 'ml', 
                      'fluid ounce', 'fl oz']
  return volumeUnits.includes(unit.toLowerCase())
}

export function isWeightUnit(unit: string): boolean {
  const weightUnits = ['pound', 'lb', 'lbs', 'ounce', 'oz', 'gram', 'g', 'kilogram', 'kg']
  return weightUnits.includes(unit.toLowerCase())
}

export function isCountUnit(unit: string): boolean {
  const countUnits = ['piece', 'pieces', 'whole', 'each', 'dozen', 'dz']
  return countUnits.includes(unit.toLowerCase())
}
