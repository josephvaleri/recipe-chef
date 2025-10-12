import * as cheerio from 'cheerio'
import { decode } from 'html-entities'

export interface RecipeData {
  name: string
  description?: string
  image?: string | string[]
  author?: string | { name: string }
  datePublished?: string
  dateModified?: string
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string | number
  recipeCategory?: string
  recipeCuisine?: string
  recipeIngredient?: string[]
  recipeInstructions?: string | Array<{ text: string } | string>
  nutrition?: {
    calories?: string
    proteinContent?: string
    fatContent?: string
    carbohydrateContent?: string
  }
  aggregateRating?: {
    ratingValue: number
    reviewCount: number
  }
  url?: string
}

export interface ParseResult {
  recipe?: RecipeData
  confidence: 'high' | 'medium' | 'low'
  source: 'jsonld' | 'microdata' | 'rdfa' | 'h-recipe' | 'heuristic'
}

export function parseRecipeFromHtml(html: string, url: string): ParseResult {
  const $ = cheerio.load(html)
  
  console.log('Starting recipe parse for URL:', url)
  
  // Try JSON-LD first (highest confidence)
  const jsonLdRecipe = parseJsonLd($, url)
  if (jsonLdRecipe) {
    console.log('Successfully parsed via JSON-LD')
    return { recipe: jsonLdRecipe, confidence: 'high', source: 'jsonld' }
  }
  
  console.log('JSON-LD failed, trying Microdata...')
  
  // Try Microdata
  const microdataRecipe = parseMicrodata($, url)
  if (microdataRecipe) {
    console.log('Successfully parsed via Microdata')
    return { recipe: microdataRecipe, confidence: 'high', source: 'microdata' }
  }
  
  console.log('Microdata failed, trying RDFa...')
  
  // Try RDFa
  const rdfaRecipe = parseRdfa($, url)
  if (rdfaRecipe) {
    console.log('Successfully parsed via RDFa')
    return { recipe: rdfaRecipe, confidence: 'medium', source: 'rdfa' }
  }
  
  console.log('RDFa failed, trying h-recipe...')
  
  // Try h-recipe microformat
  const hRecipe = parseHRecipe($, url)
  if (hRecipe) {
    console.log('Successfully parsed via h-recipe')
    return { recipe: hRecipe, confidence: 'medium', source: 'h-recipe' }
  }
  
  console.log('h-recipe failed, using heuristic fallback...')
  
  // Fallback to heuristic parsing
  const heuristicRecipe = parseHeuristic($, url)
  console.log('Heuristic parsing result:', heuristicRecipe ? 'success' : 'failed')
  return { recipe: heuristicRecipe || undefined, confidence: 'low', source: 'heuristic' }
}

function parseJsonLd($: cheerio.CheerioAPI, url: string): RecipeData | undefined {
  const scripts = $('script[type="application/ld+json"]')
  
  console.log(`Found ${scripts.length} JSON-LD scripts`)
  
  for (let i = 0; i < scripts.length; i++) {
    try {
      const jsonText = $(scripts[i]).html()
      if (!jsonText) continue
      
      const data = JSON.parse(jsonText)
      const items = Array.isArray(data) ? data : [data]
      
      console.log(`JSON-LD script ${i + 1}:`, items)
      
      for (const item of items) {
        // Check if item has @graph (schema.org graph structure)
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          console.log('Found @graph with', item['@graph'].length, 'items')
          // Search for Recipe within @graph
          for (const graphItem of item['@graph']) {
            if (graphItem['@type'] === 'Recipe' || 
                (Array.isArray(graphItem['@type']) && graphItem['@type'].includes('Recipe'))) {
              console.log('Found Recipe in @graph:', {
                name: graphItem.name,
                hasImage: !!graphItem.image,
                hasPrepTime: !!graphItem.prepTime,
                hasCookTime: !!graphItem.cookTime,
                hasTotalTime: !!graphItem.totalTime,
                hasRecipeYield: !!graphItem.recipeYield,
                hasRecipeCategory: !!graphItem.recipeCategory,
                imageType: typeof graphItem.image,
                prepTime: graphItem.prepTime,
                cookTime: graphItem.cookTime
              })
              return normalizeRecipeData(graphItem, url)
            }
          }
        }
        
        // Also check top-level items
        if (item['@type'] === 'Recipe' || 
            (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
          console.log('Found Recipe in JSON-LD:', {
            name: item.name,
            hasImage: !!item.image,
            hasPrepTime: !!item.prepTime,
            hasCookTime: !!item.cookTime,
            hasTotalTime: !!item.totalTime,
            hasRecipeYield: !!item.recipeYield,
            hasRecipeCategory: !!item.recipeCategory,
            imageType: typeof item.image,
            prepTime: item.prepTime,
            cookTime: item.cookTime
          })
          return normalizeRecipeData(item, url)
        }
      }
    } catch (error) {
      console.warn('Error parsing JSON-LD:', error)
    }
  }
  
  console.log('No Recipe found in JSON-LD, trying other parsers...')
  return undefined
}

function parseMicrodata($: cheerio.CheerioAPI, url: string): RecipeData | null {
  const recipeEl = $('[itemtype*="Recipe"]').first()
  if (!recipeEl.length) return null
  
  const recipe: any = {}
  
  // Basic properties
  recipe.name = recipeEl.find('[itemprop="name"]').text().trim() || 
                recipeEl.attr('itemprop') === 'name' ? recipeEl.text().trim() : ''
  
  recipe.description = recipeEl.find('[itemprop="description"]').text().trim()
  recipe.author = recipeEl.find('[itemprop="author"]').text().trim()
  recipe.datePublished = recipeEl.find('[itemprop="datePublished"]').attr('content')
  recipe.recipeCategory = recipeEl.find('[itemprop="recipeCategory"]').text().trim()
  recipe.recipeCuisine = recipeEl.find('[itemprop="recipeCuisine"]').text().trim()
  recipe.prepTime = recipeEl.find('[itemprop="prepTime"]').attr('content')
  recipe.cookTime = recipeEl.find('[itemprop="cookTime"]').attr('content')
  recipe.totalTime = recipeEl.find('[itemprop="totalTime"]').attr('content')
  recipe.recipeYield = recipeEl.find('[itemprop="recipeYield"]').text().trim()
  
  // Image
  const imageEl = recipeEl.find('[itemprop="image"]')
  if (imageEl.length) {
    const imageUrl = imageEl.attr('src') || imageEl.attr('content')
    if (imageUrl) recipe.image = imageUrl
  }
  
  // Ingredients
  const ingredients = recipeEl.find('[itemprop="recipeIngredient"]')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(ing => ing.length > 0)
  
  if (ingredients.length > 0) {
    recipe.recipeIngredient = ingredients
  }
  
  // Instructions
  const instructions = recipeEl.find('[itemprop="recipeInstructions"]')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(inst => inst.length > 0)
  
  if (instructions.length > 0) {
    recipe.recipeInstructions = instructions
  }
  
  if (!recipe.name) return null
  
  return normalizeRecipeData(recipe, url)
}

function parseRdfa($: cheerio.CheerioAPI, url: string): RecipeData | null {
  // Simplified RDFa parsing - would need more robust implementation
  const recipeEl = $('[typeof*="Recipe"]').first()
  if (!recipeEl.length) return null
  
  const recipe: any = {}
  recipe.name = recipeEl.find('[property="name"]').text().trim()
  
  if (!recipe.name) return null
  
  return normalizeRecipeData(recipe, url)
}

function parseHRecipe($: cheerio.CheerioAPI, url: string): RecipeData | null {
  const recipeEl = $('.h-recipe').first()
  if (!recipeEl.length) return null
  
  const recipe: any = {}
  recipe.name = recipeEl.find('.p-name').text().trim()
  recipe.description = recipeEl.find('.p-summary').text().trim()
  recipe.author = recipeEl.find('.p-author').text().trim()
  
  // Ingredients
  const ingredients = recipeEl.find('.p-ingredient')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(ing => ing.length > 0)
  
  if (ingredients.length > 0) {
    recipe.recipeIngredient = ingredients
  }
  
  // Instructions
  const instructions = recipeEl.find('.e-instructions')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(inst => inst.length > 0)
  
  if (instructions.length > 0) {
    recipe.recipeInstructions = instructions
  }
  
  if (!recipe.name) return null
  
  return normalizeRecipeData(recipe, url)
}

function parseHeuristic($: cheerio.CheerioAPI, url: string): RecipeData | null {
  // Heuristic parsing based on common patterns
  const title = $('h1').first().text().trim() || 
                $('title').text().trim() ||
                $('[class*="title"]').first().text().trim()
  
  if (!title) return null
  
  const recipe: any = { name: title }
  
  // Look for ingredient lists
  const ingredientSelectors = [
    '[class*="ingredient"]',
    '[class*="recipe-ingredient"]',
    'ul li',
    'ol li'
  ]
  
  for (const selector of ingredientSelectors) {
    const items = $(selector)
      .filter((_, el) => {
        const text = $(el).text().trim()
        return text.length > 0 && text.length < 200 && 
               (text.includes('cup') || text.includes('tbsp') || text.includes('tsp') || 
                text.includes('lb') || text.includes('oz') || /\d/.test(text))
      })
      .map((_, el) => $(el).text().trim())
      .get()
    
    if (items.length >= 3) {
      recipe.recipeIngredient = items
      break
    }
  }
  
  // Look for instructions
  const instructionSelectors = [
    '[class*="instruction"]',
    '[class*="step"]',
    '[class*="direction"]',
    'p'
  ]
  
  for (const selector of instructionSelectors) {
    const items = $(selector)
      .filter((_, el) => {
        const text = $(el).text().trim()
        return text.length > 20 && text.length < 500
      })
      .map((_, el) => $(el).text().trim())
      .get()
    
    if (items.length >= 2) {
      recipe.recipeInstructions = items
      break
    }
  }
  
  return normalizeRecipeData(recipe, url)
}

function normalizeRecipeData(data: any, url: string): RecipeData {
  const recipe: RecipeData = {
    name: decode(data.name || data.title || ''),
    url
  }
  
  if (data.description) recipe.description = decode(data.description)
  if (data.image) {
    console.log('Raw image data:', data.image, 'Type:', typeof data.image)
    
    // Handle different image formats
    const normalizeImageUrl = (img: any): string => {
      if (typeof img === 'string') return img
      if (img?.url) return img.url // ImageObject with url property
      if (img?.contentUrl) return img.contentUrl // Alternative property
      if (img?.thumbnailUrl) return img.thumbnailUrl // Thumbnail as fallback
      if (img?.['@id']) return img['@id'] // Sometimes image is just an ID/URL
      return ''
    }
    
    if (Array.isArray(data.image)) {
      const urls = data.image.map(normalizeImageUrl).filter((url: string) => url)
      console.log('Normalized image URLs from array:', urls)
      recipe.image = urls.length > 0 ? urls : undefined
    } else {
      const url = normalizeImageUrl(data.image)
      console.log('Normalized image URL:', url)
      recipe.image = url ? [url] : undefined
    }
    
    console.log('Final recipe.image:', recipe.image)
  } else {
    console.log('No image data in recipe')
  }
  if (data.author) {
    // Handle Person, Organization, or string
    if (typeof data.author === 'string') {
      recipe.author = decode(data.author)
    } else if (data.author?.name) {
      recipe.author = { name: decode(data.author.name) }
    } else if (data.author?.['@type'] === 'Person' || data.author?.['@type'] === 'Organization') {
      recipe.author = { name: decode(data.author.name || 'Unknown') }
    }
  }
  if (data.datePublished) recipe.datePublished = data.datePublished
  if (data.dateModified) recipe.dateModified = data.dateModified
  
  // Convert ISO 8601 duration format to readable format
  const normalizeDuration = (duration: string): string => {
    if (!duration) return ''
    // If already in readable format, return as-is
    if (!duration.startsWith('PT') && !duration.startsWith('P')) return duration
    
    // Parse ISO 8601 duration (e.g., PT15M, PT1H30M, P1D)
    let result = duration
      .replace(/^PT/, '') // Remove PT prefix
      .replace(/^P/, '')  // Remove P prefix
      .replace(/(\d+)D/g, '$1 days ') // Days
      .replace(/(\d+)H/g, '$1h ') // Hours
      .replace(/(\d+)M/g, '$1m') // Minutes
      .replace(/(\d+)S/g, '$1s') // Seconds
      .trim()
    
    return result || duration // Return original if parsing fails
  }
  
  if (data.prepTime) recipe.prepTime = normalizeDuration(data.prepTime)
  if (data.cookTime) recipe.cookTime = normalizeDuration(data.cookTime)
  if (data.totalTime) recipe.totalTime = normalizeDuration(data.totalTime)
  // Handle recipeYield - can be string, number, array, or object
  if (data.recipeYield) {
    console.log('recipeYield raw data:', data.recipeYield, 'type:', typeof data.recipeYield)
    
    if (typeof data.recipeYield === 'string') {
      recipe.recipeYield = data.recipeYield
    } else if (typeof data.recipeYield === 'number') {
      recipe.recipeYield = String(data.recipeYield)
    } else if (Array.isArray(data.recipeYield)) {
      // Sometimes it's an array like ["8", "8 servings"]
      const firstValue = data.recipeYield.find((v: any) => v && String(v).trim())
      recipe.recipeYield = String(firstValue || '')
      console.log('recipeYield from array:', recipe.recipeYield)
    } else if (data.recipeYield?.value) {
      recipe.recipeYield = String(data.recipeYield.value)
    } else if (typeof data.recipeYield === 'object') {
      // Try to extract any reasonable value
      const value = data.recipeYield.servings || data.recipeYield.amount || data.recipeYield['@value'] || ''
      recipe.recipeYield = String(value)
      console.log('recipeYield from object:', recipe.recipeYield)
    }
    
    console.log('Final recipeYield:', recipe.recipeYield)
  } else {
    console.log('No recipeYield in data')
  }
  if (data.recipeCategory) recipe.recipeCategory = data.recipeCategory
  if (data.recipeCuisine) recipe.recipeCuisine = data.recipeCuisine
  
  // Normalize recipeIngredient - handle both array and string with newlines
  if (data.recipeIngredient) {
    if (Array.isArray(data.recipeIngredient)) {
      recipe.recipeIngredient = data.recipeIngredient.map((ing: string) => decode(ing))
    } else if (typeof data.recipeIngredient === 'string') {
      // Some sites provide a single string with newlines - split it
      recipe.recipeIngredient = data.recipeIngredient
        .split(/[\n\r]+/)
        .map((line: string) => decode(line.trim()))
        .filter((line: string) => line.length > 0)
      
      console.log('Normalized recipeIngredient from string to array:', recipe.recipeIngredient?.length || 0, 'ingredients')
    }
  }
  
  if (data.recipeInstructions) {
    // Handle HowToStep, HowToSection, or string
    const normalizeInstruction = (inst: any): string => {
      if (typeof inst === 'string') return decode(inst)
      if (inst?.text) return decode(inst.text)
      if (inst?.['@type'] === 'HowToStep' && inst.text) return decode(inst.text)
      if (inst?.['@type'] === 'HowToSection' && inst.itemListElement) {
        // Flatten HowToSection into individual steps
        return inst.itemListElement
          .map((step: any) => normalizeInstruction(step))
          .filter((s: string) => s)
          .join('\n\n')
      }
      return ''
    }
    
    if (Array.isArray(data.recipeInstructions)) {
      recipe.recipeInstructions = data.recipeInstructions
        .map(normalizeInstruction)
        .filter((inst: string) => inst)
    } else if (typeof data.recipeInstructions === 'string') {
      recipe.recipeInstructions = decode(data.recipeInstructions)
    } else {
      recipe.recipeInstructions = normalizeInstruction(data.recipeInstructions)
    }
  }
  
  // Handle NutritionInformation object
  if (data.nutrition) {
    if (typeof data.nutrition === 'object' && data.nutrition !== null) {
      recipe.nutrition = {
        calories: data.nutrition.calories || data.nutrition.energyContent,
        proteinContent: data.nutrition.proteinContent,
        fatContent: data.nutrition.fatContent,
        carbohydrateContent: data.nutrition.carbohydrateContent
      }
    }
  }
  
  // Handle AggregateRating object
  if (data.aggregateRating) {
    if (typeof data.aggregateRating === 'object' && data.aggregateRating !== null) {
      recipe.aggregateRating = {
        ratingValue: parseFloat(data.aggregateRating.ratingValue || data.aggregateRating.value || 0),
        reviewCount: parseInt(data.aggregateRating.reviewCount || data.aggregateRating.count || 0)
      }
    }
  }
  
  return recipe
}
