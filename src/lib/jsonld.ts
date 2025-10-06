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
  
  // Try JSON-LD first (highest confidence)
  const jsonLdRecipe = parseJsonLd($, url)
  if (jsonLdRecipe) {
    return { recipe: jsonLdRecipe, confidence: 'high', source: 'jsonld' }
  }
  
  // Try Microdata
  const microdataRecipe = parseMicrodata($, url)
  if (microdataRecipe) {
    return { recipe: microdataRecipe, confidence: 'high', source: 'microdata' }
  }
  
  // Try RDFa
  const rdfaRecipe = parseRdfa($, url)
  if (rdfaRecipe) {
    return { recipe: rdfaRecipe, confidence: 'medium', source: 'rdfa' }
  }
  
  // Try h-recipe microformat
  const hRecipe = parseHRecipe($, url)
  if (hRecipe) {
    return { recipe: hRecipe, confidence: 'medium', source: 'h-recipe' }
  }
  
  // Fallback to heuristic parsing
  const heuristicRecipe = parseHeuristic($, url)
  return { recipe: heuristicRecipe, confidence: 'low', source: 'heuristic' }
}

function parseJsonLd($: cheerio.CheerioAPI, url: string): RecipeData | null {
  const scripts = $('script[type="application/ld+json"]')
  
  for (let i = 0; i < scripts.length; i++) {
    try {
      const jsonText = $(scripts[i]).html()
      if (!jsonText) continue
      
      const data = JSON.parse(jsonText)
      const items = Array.isArray(data) ? data : [data]
      
      for (const item of items) {
        if (item['@type'] === 'Recipe' || 
            (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
          return normalizeRecipeData(item, url)
        }
      }
    } catch (error) {
      console.warn('Error parsing JSON-LD:', error)
    }
  }
  
  return null
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
    recipe.image = Array.isArray(data.image) ? data.image : [data.image]
  }
  if (data.author) {
    recipe.author = typeof data.author === 'string' 
      ? decode(data.author) 
      : { name: decode(data.author.name || '') }
  }
  if (data.datePublished) recipe.datePublished = data.datePublished
  if (data.dateModified) recipe.dateModified = data.dateModified
  if (data.prepTime) recipe.prepTime = data.prepTime
  if (data.cookTime) recipe.cookTime = data.cookTime
  if (data.totalTime) recipe.totalTime = data.totalTime
  if (data.recipeYield) recipe.recipeYield = data.recipeYield
  if (data.recipeCategory) recipe.recipeCategory = data.recipeCategory
  if (data.recipeCuisine) recipe.recipeCuisine = data.recipeCuisine
  
  if (data.recipeIngredient && Array.isArray(data.recipeIngredient)) {
    recipe.recipeIngredient = data.recipeIngredient.map((ing: string) => decode(ing))
  }
  
  if (data.recipeInstructions) {
    if (Array.isArray(data.recipeInstructions)) {
      recipe.recipeInstructions = data.recipeInstructions.map((inst: any) => 
        typeof inst === 'string' ? decode(inst) : decode(inst.text || '')
      )
    } else {
      recipe.recipeInstructions = decode(data.recipeInstructions)
    }
  }
  
  if (data.nutrition) recipe.nutrition = data.nutrition
  if (data.aggregateRating) recipe.aggregateRating = data.aggregateRating
  
  return recipe
}
