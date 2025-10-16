/**
 * Parses an ingredient string to extract amount, unit, and ingredient name
 * Examples:
 *   "1 cup flour" → { amount: "1", unit: "cup", name: "flour" }
 *   "2 tablespoons olive oil" → { amount: "2", unit: "tablespoons", name: "olive oil" }
 *   "1/2 teaspoon salt" → { amount: "1/2", unit: "teaspoon", name: "salt" }
 *   "salt and pepper to taste" → { amount: "", unit: "", name: "salt and pepper to taste" }
 */

const COMMON_UNITS = [
  // Volume
  'cup', 'cups', 'c',
  'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'tb',
  'teaspoon', 'teaspoons', 'tsp', 'ts',
  'fluid ounce', 'fluid ounces', 'fl oz', 'fl. oz.',
  'pint', 'pints', 'pt',
  'quart', 'quarts', 'qt',
  'gallon', 'gallons', 'gal',
  'milliliter', 'milliliters', 'millilitre', 'millilitres', 'ml',
  'liter', 'liters', 'litre', 'litres', 'l',
  'deciliter', 'deciliters', 'decilitre', 'decilitres', 'dl',
  
  // Weight
  'pound', 'pounds', 'lb', 'lbs',
  'ounce', 'ounces', 'oz',
  'gram', 'grams', 'gramme', 'grammes', 'g',
  'kilogram', 'kilograms', 'kilogramme', 'kilogrammes', 'kg',
  'milligram', 'milligrams', 'milligramme', 'milligrammes', 'mg',
  
  // Length
  'inch', 'inches', 'in',
  'centimeter', 'centimeters', 'centimetre', 'centimetres', 'cm',
  
  // Other
  'pinch', 'pinches',
  'dash', 'dashes',
  'clove', 'cloves',
  'slice', 'slices',
  'piece', 'pieces',
  'can', 'cans',
  'jar', 'jars',
  'package', 'packages', 'pkg',
  'box', 'boxes',
  'bag', 'bags',
  'bunch', 'bunches',
  'head', 'heads',
  'sprig', 'sprigs',
  'stalk', 'stalks',
  'stick', 'sticks',
  'sheet', 'sheets',
  'leaf', 'leaves',
  'whole', 'wholes',
  'small', 'medium', 'large',
  'to taste'
]

export interface ParsedIngredient {
  amount: string
  unit: string
  name: string
  original: string
}

export function parseIngredient(ingredientText: string): ParsedIngredient {
  const original = ingredientText.trim()
  
  if (!original) {
    return { amount: '', unit: '', name: '', original }
  }
  
  // Remove leading/trailing punctuation and whitespace
  const text = original.replace(/^[•▢\-\s]+/, '').trim()
  
  // Pattern 1: Try to match a number (including fractions, decimals, ranges) at the start
  // Examples: "1", "1/2", "1.5", "1-2", "1 1/2"
  const amountPattern = /^(\d+(?:[\/\.\-]\d+)?(?:\s+\d+\/\d+)?)\s+/
  const amountMatch = text.match(amountPattern)
  
  let amount = ''
  let remainingText = text
  
  if (amountMatch) {
    amount = amountMatch[1].trim()
    remainingText = text.substring(amountMatch[0].length).trim()
  }
  
  // Pattern 2: Try to match a unit after the amount
  let unit = ''
  let name = remainingText
  
  // Check if the text starts with a common unit
  for (const commonUnit of COMMON_UNITS) {
    // Create a regex that matches the unit as a whole word (case-insensitive)
    const unitPattern = new RegExp(`^(${escapeRegex(commonUnit)})(?:\\s+|\\b)`, 'i')
    const unitMatch = remainingText.match(unitPattern)
    
    if (unitMatch) {
      unit = unitMatch[1].trim()
      name = remainingText.substring(unitMatch[0].length).trim()
      break
    }
  }
  
  // Clean up the name
  name = name
    .replace(/^[,\-\s]+/, '') // Remove leading punctuation
    .trim()
  
  // Handle special cases where units appear in parentheses
  // Example: "1 (14 ounce) can tomatoes" → extract "14 ounce" as unit
  const parenPattern = /^\(([^)]+)\)\s+/
  const parenMatch = name.match(parenPattern)
  if (parenMatch && !unit) {
    // Check if the parenthetical content contains a unit
    const parenContent = parenMatch[1]
    for (const commonUnit of COMMON_UNITS) {
      if (parenContent.toLowerCase().includes(commonUnit.toLowerCase())) {
        unit = parenContent.trim()
        name = name.substring(parenMatch[0].length).trim()
        break
      }
    }
  }
  
  return {
    amount: amount || '',
    unit: unit || '',
    name: name || original,
    original
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse multiple ingredients at once
 */
export function parseIngredients(ingredientTexts: string[]): ParsedIngredient[] {
  return ingredientTexts.map(parseIngredient)
}



