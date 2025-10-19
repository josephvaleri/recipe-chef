/**
 * Parse recipe text from various formats (Paprika, Meal-Master, etc.)
 */

export interface ParsedRecipe {
  name: string
  description?: string
  recipeIngredient: string[]
  recipeInstructions: string[]
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string
  source?: string
  sourceUrl?: string
}

export type RecipeFormat = 'paprika' | 'meal-master' | 'auto-detect'

export async function parseRecipeFromText(
  text: string, 
  format: RecipeFormat = 'auto-detect'
): Promise<ParsedRecipe | null> {
  try {
    // Auto-detect format if not specified
    if (format === 'auto-detect') {
      format = detectFormat(text)
    }

    switch (format) {
      case 'paprika':
        return parsePaprikaFormat(text)
      case 'meal-master':
        return parseMealMasterFormat(text)
      default:
        return parseGenericFormat(text)
    }
  } catch (error) {
    console.error('Error parsing recipe text:', error)
    return null
  }
}

function detectFormat(text: string): RecipeFormat {
  const lowerText = text.toLowerCase()
  
  // Check for Paprika format indicators
  if (lowerText.includes('## ingredients') || lowerText.includes('## instructions')) {
    return 'paprika'
  }
  
  // Check for Meal-Master format indicators
  if (lowerText.includes('title:') || lowerText.includes('categories:')) {
    return 'meal-master'
  }
  
  // Default to generic parsing
  return 'paprika'
}

function parsePaprikaFormat(text: string): ParsedRecipe | null {
  const lines = text.split('\n')
  const recipe: Partial<ParsedRecipe> = {
    recipeIngredient: [],
    recipeInstructions: []
  }

  let currentSection = ''
  let inIngredients = false
  let inInstructions = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) continue

    // Check for title (first # line)
    if (line.startsWith('# ') && !recipe.name) {
      recipe.name = line.substring(2).trim()
      continue
    }

    // Check for description (text after title, before sections)
    if (!recipe.name) {
      recipe.description = line
      continue
    }

    // Check for sections
    if (line.startsWith('## ')) {
      const section = line.substring(3).toLowerCase()
      inIngredients = section.includes('ingredient')
      inInstructions = section.includes('instruction')
      currentSection = section
      continue
    }

    // Check for timing information
    if (line.toLowerCase().startsWith('prep:')) {
      recipe.prepTime = line.substring(5).trim()
      continue
    }
    if (line.toLowerCase().startsWith('cook:')) {
      recipe.cookTime = line.substring(5).trim()
      continue
    }
    if (line.toLowerCase().startsWith('total:')) {
      recipe.totalTime = line.substring(6).trim()
      continue
    }
    if (line.toLowerCase().startsWith('servings:')) {
      recipe.recipeYield = line.substring(9).trim()
      continue
    }

    // Parse ingredients
    if (inIngredients && line.startsWith('- ')) {
      recipe.recipeIngredient!.push(line.substring(2).trim())
      continue
    }

    // Parse instructions
    if (inInstructions) {
      // Handle numbered instructions
      const match = line.match(/^(\d+)\.\s*(.+)$/)
      if (match) {
        recipe.recipeInstructions!.push(match[2].trim())
      } else if (line.length > 0) {
        // Handle non-numbered instructions
        recipe.recipeInstructions!.push(line)
      }
      continue
    }

    // Check for source
    if (line.toLowerCase().startsWith('source:')) {
      recipe.source = line.substring(7).trim()
      continue
    }
  }

  // Validate required fields
  if (!recipe.name || recipe.recipeIngredient!.length === 0 || recipe.recipeInstructions!.length === 0) {
    return null
  }

  return recipe as ParsedRecipe
}

function parseMealMasterFormat(text: string): ParsedRecipe | null {
  const lines = text.split('\n')
  const recipe: Partial<ParsedRecipe> = {
    recipeIngredient: [],
    recipeInstructions: []
  }

  let inIngredients = false
  let inInstructions = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) continue

    // Check for title
    if (line.toLowerCase().startsWith('title:')) {
      recipe.name = line.substring(6).trim()
      continue
    }

    // Check for categories (often contains description)
    if (line.toLowerCase().startsWith('categories:')) {
      recipe.description = line.substring(11).trim()
      continue
    }

    // Check for yield
    if (line.toLowerCase().startsWith('yield:')) {
      recipe.recipeYield = line.substring(6).trim()
      continue
    }

    // Check for source
    if (line.toLowerCase().startsWith('source:')) {
      recipe.source = line.substring(7).trim()
      continue
    }

    // Check for section markers
    if (line === '-----') {
      if (!inIngredients && !inInstructions) {
        inIngredients = true
      } else if (inIngredients) {
        inIngredients = false
        inInstructions = true
      }
      continue
    }

    // Parse ingredients
    if (inIngredients && line) {
      recipe.recipeIngredient!.push(line)
      continue
    }

    // Parse instructions
    if (inInstructions && line) {
      recipe.recipeInstructions!.push(line)
      continue
    }
  }

  // Validate required fields
  if (!recipe.name || recipe.recipeIngredient!.length === 0 || recipe.recipeInstructions!.length === 0) {
    return null
  }

  return recipe as ParsedRecipe
}

function parseGenericFormat(text: string): ParsedRecipe | null {
  // Try to parse as a generic recipe format
  const lines = text.split('\n')
  const recipe: Partial<ParsedRecipe> = {
    recipeIngredient: [],
    recipeInstructions: []
  }

  let currentSection = ''
  let inIngredients = false
  let inInstructions = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) continue

    // Check for title (first non-empty line or line starting with #)
    if (!recipe.name && (line.startsWith('#') || i === 0)) {
      recipe.name = line.replace(/^#+\s*/, '').trim()
      continue
    }

    // Check for section headers
    const lowerLine = line.toLowerCase()
    if (lowerLine.includes('ingredient')) {
      inIngredients = true
      inInstructions = false
      continue
    }
    if (lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('step')) {
      inIngredients = false
      inInstructions = true
      continue
    }

    // Parse ingredients
    if (inIngredients && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))) {
      recipe.recipeIngredient!.push(line.replace(/^[-•*]\s*/, '').trim())
      continue
    }

    // Parse instructions
    if (inInstructions) {
      // Handle numbered instructions
      const match = line.match(/^(\d+)\.\s*(.+)$/)
      if (match) {
        recipe.recipeInstructions!.push(match[2].trim())
      } else if (line.length > 0) {
        recipe.recipeInstructions!.push(line)
      }
      continue
    }

    // Check for timing information
    if (lowerLine.includes('prep') && lowerLine.includes(':')) {
      recipe.prepTime = line.split(':')[1]?.trim()
      continue
    }
    if (lowerLine.includes('cook') && lowerLine.includes(':')) {
      recipe.cookTime = line.split(':')[1]?.trim()
      continue
    }
    if (lowerLine.includes('total') && lowerLine.includes(':')) {
      recipe.totalTime = line.split(':')[1]?.trim()
      continue
    }
    if (lowerLine.includes('serving') && lowerLine.includes(':')) {
      recipe.recipeYield = line.split(':')[1]?.trim()
      continue
    }
  }

  // If we still don't have a name, use the first line
  if (!recipe.name && lines.length > 0) {
    recipe.name = lines[0].replace(/^#+\s*/, '').trim()
  }

  // Validate required fields
  if (!recipe.name || recipe.recipeIngredient!.length === 0 || recipe.recipeInstructions!.length === 0) {
    return null
  }

  return recipe as ParsedRecipe
}
