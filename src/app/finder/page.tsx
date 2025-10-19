'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, getCurrentProfile, type Profile } from '@/lib/auth'
import { ChefOuiOui } from '@/components/chef-ouioui'
import RecipeCard from '@/components/recipe-card'
import { 
  ChefHat, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  Users, 
  Star, 
  ArrowLeft,
  Globe,
  Sparkles,
  ChefHat as DifficultyIcon
} from 'lucide-react'

interface GlobalRecipe {
  recipe_id?: number
  user_recipe_id?: number
  title: string
  description?: string
  image_url?: string
  prep_time?: string
  cook_time?: string
  total_time?: string
  servings?: string
  difficulty?: string
  added_count?: number
  cuisine?: { name: string }
  meal_type?: { name: string }
  ingredients?: Array<{
    ingredient: { name: string; category_id: number }
    amount?: string
    unit?: string
  }>
  rating?: number
  score?: number
  source?: string
  ingredientMatches?: number
  matchPercentage?: number
  totalScore?: number
  matchedIngredients?: any[]
}

interface FilterState {
  cuisine_id?: number
  meal_type_id?: number
  proteins: number[]
  vegetables: number[]
  fruits: number[]
  grains: number[]
  dairy: number[]
  spices: number[]
  difficulty?: string
}

export default function RecipeFinderPage() {
  // CACHE BUST - v1.2.1 - Force browser to reload new search logic
  const [userRecipes, setUserRecipes] = useState<GlobalRecipe[]>([])
  const [globalRecipes, setGlobalRecipes] = useState<GlobalRecipe[]>([])
  const [aiRecipes, setAiRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLoadingProgress, setAiLoadingProgress] = useState(0)
  const [aiLoadingMessage, setAiLoadingMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    proteins: [],
    vegetables: [],
    fruits: [],
    grains: [],
    dairy: [],
    spices: []
  })
  const [cuisines, setCuisines] = useState<any[]>([])
  const [mealTypes, setMealTypes] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    proteins: true,
    vegetables: true,
    fruits: true,
    grains: true,
    dairy: true,
    spices: true
  })
  const [showAllIngredients, setShowAllIngredients] = useState<Record<string, boolean>>({
    proteins: false,
    vegetables: false,
    fruits: false,
    grains: false,
    dairy: false,
    spices: false
  })
  const router = useRouter()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    console.log('🔍 DEBUG: Filters changed, checking for search trigger')
    console.log('🔍 DEBUG: Current filters:', filters)
    
    // Only search if at least one ingredient is selected
    const hasSelectedIngredients = [
      ...filters.proteins,
      ...filters.vegetables,
      ...filters.fruits,
      ...filters.grains,
      ...filters.dairy,
      ...filters.spices
    ]

    console.log('🔍 DEBUG: Total selected ingredients:', hasSelectedIngredients.length)
    console.log('🔍 DEBUG: Selected ingredients:', hasSelectedIngredients)

    if (hasSelectedIngredients.length > 0) {
      console.log('🔍 DEBUG: Triggering searchRecipes()')
      searchRecipes()
    } else {
      console.log('🔍 DEBUG: No ingredients selected, clearing recipes')
      // Clear recipes when no ingredients are selected
      setUserRecipes([])
      setGlobalRecipes([])
      
      // Check if this was an AI search with no ingredient matches - trigger OpenAI fallback
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('aiSearch') === 'true' && searchQuery.trim()) {
        console.log('🔍 DEBUG: AI search with no ingredient matches, triggering OpenAI fallback')
        generateRecipesWithOpenAI(searchQuery)
      }
    }
  }, [filters])

  // Separate useEffect to handle AI search after ingredients are loaded
  useEffect(() => {
    // Only process AI search if we have ingredients loaded
    if (ingredients.length === 0) {
      console.log('🔍 DEBUG: Ingredients not loaded yet, skipping AI search')
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    console.log('🔍 DEBUG: Checking for AI search after ingredients loaded')
    console.log('🔍 DEBUG: aiSearch param:', urlParams.get('aiSearch'))
    
    if (urlParams.get('aiSearch') === 'true') {
      const aiSearchQuery = sessionStorage.getItem('aiSearchQuery')
      console.log('🔍 DEBUG: AI search detected, query from sessionStorage:', aiSearchQuery)
      
      if (aiSearchQuery) {
        console.log('🔍 DEBUG: Processing AI search query:', aiSearchQuery)
        setSearchQuery(aiSearchQuery)
        
        // Check the search source to determine the search strategy
        const searchSource = sessionStorage.getItem('aiSearchSource') || 'recipe_finder_search'
        console.log('🔍 DEBUG: AI search source:', searchSource)
        
        if (searchSource === 'recipe_name_search') {
          console.log('🔍 DEBUG: Recipe name search - checking for pre-computed results')
          
          // Check if we have pre-computed recipe name search results
          const recipeNameResults = sessionStorage.getItem('recipeNameResults')
          const aiGeneratedRecipes = sessionStorage.getItem('aiGeneratedRecipes')
          
          if (recipeNameResults) {
            console.log('🔍 DEBUG: Found pre-computed recipe name results')
            const results = JSON.parse(recipeNameResults)
            
            if (results.type === 'database_results') {
              // Display database results directly
              const userRecipesData = (results.userRecipes || []).map((recipe: any) => ({ ...recipe, source: 'user' }))
              const globalRecipesData = (results.globalRecipes || []).map((recipe: any) => ({ ...recipe, source: 'global' }))
              
              setUserRecipes(userRecipesData)
              setGlobalRecipes(globalRecipesData)
              
              // Clear session storage
              sessionStorage.removeItem('recipeNameResults')
              sessionStorage.removeItem('aiSearchQuery')
              sessionStorage.removeItem('aiSearchSource')
              console.log('🔍 DEBUG: Cleared session storage after displaying database results')
            }
          } else if (aiGeneratedRecipes) {
            console.log('🔍 DEBUG: Found AI generated recipes for recipe name search')
            const recipes = JSON.parse(aiGeneratedRecipes)
            
            // Format the generated recipes for display
            const formattedRecipes = recipes.map((recipe: any) => {
              // Parse instructions from JSON-LD format
              const instructions = recipe.recipeInstructions?.map((step: any) => {
                if (typeof step === 'string') {
                  return step
                } else if (step && step.text) {
                  return step.text
                }
                return step
              }) || []

              // Parse ingredients from JSON-LD format
              const ingredients = recipe.recipeIngredient?.map((ing: string) => ({
                ingredient: { name: ing, category_id: 1 },
                raw_name: ing
              })) || []

              return {
                recipe_id: `ai_${Date.now()}_${Math.random()}`,
                title: recipe.name,
                description: recipe.description,
                image_url: recipe.image || '/placeholder-recipe.jpg',
                prep_time: recipe.prepTime,
                cook_time: recipe.cookTime,
                total_time: recipe.totalTime,
                servings: recipe.recipeYield,
                difficulty: 'Medium',
                cuisine: { name: recipe.recipeCuisine || 'International' },
                meal_type: { name: recipe.recipeCategory || 'Main Course' },
                ingredients: ingredients,
                steps: instructions.map((instruction: string, index: number) => ({
                  step_number: index + 1,
                  text: instruction
                })),
                equipment: [],
                tags: [],
                source: 'ai_generated',
                is_saveable: true // Mark as saveable
              }
            })
            
            // Display AI generated recipes as global recipes
            setGlobalRecipes(formattedRecipes)
            setUserRecipes([])
            
            // Clear session storage
            sessionStorage.removeItem('aiGeneratedRecipes')
            sessionStorage.removeItem('aiSearchQuery')
            sessionStorage.removeItem('aiSearchSource')
            console.log('🔍 DEBUG: Cleared session storage after displaying AI generated recipes')
          } else {
            console.log('🔍 DEBUG: No pre-computed results, falling back to searchRecipeTitles')
            // Fallback to the old method if no pre-computed results
            searchRecipeTitles(aiSearchQuery)
          }
        } else {
          console.log('🔍 DEBUG: Ingredient search - using parseSearchQuery')
          // For ingredient searches, use the existing ingredient parsing logic
          parseSearchQuery(aiSearchQuery)
        }
        
        // Don't clear session storage yet - let the fallback logic use it if needed
        console.log('🔍 DEBUG: Keeping aiSearchQuery in sessionStorage for potential fallback')
      } else {
        console.log('🔍 DEBUG: No aiSearchQuery found in sessionStorage')
      }
    } else {
      console.log('🔍 DEBUG: Not an AI search')
    }
  }, [ingredients]) // Run when ingredients are loaded

  const loadInitialData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const profileData = await getCurrentProfile()
      setProfile(profileData)

      // Load cuisines
      const { data: cuisinesData } = await supabase
        .from('cuisines')
        .select('*')
        .order('name')

      // Load meal types
      const { data: mealTypesData } = await supabase
        .from('meal_types')
        .select('*')
        .order('name')

      // Load all ingredients - simpler and more reliable
      // Previous optimization attempt caused issues with .in() operator limits
      // Load all ingredients using pagination to bypass any default limits
      let allIngredientsData: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from('ingredients')
          .select('*')
          .order('name')
          .range(from, from + pageSize - 1)
        
        if (pageError) {
          console.error('Error loading ingredients page:', pageError)
          break
        }
        
        if (pageData && pageData.length > 0) {
          allIngredientsData = [...allIngredientsData, ...pageData]
          from += pageSize
          hasMore = pageData.length === pageSize
        } else {
          hasMore = false
        }
      }
      
      const ingredientsData = allIngredientsData
      
      const allIngredients = (ingredientsData || []).filter(ing => 
        ing && 
        ing.ingredient_id && 
        ing.name && 
        ing.category_id !== null && 
        ing.category_id !== undefined
      )

      console.log(`Loaded ${allIngredients.length} ingredients total`)
      console.log('First ingredient:', allIngredients[0]?.name)
      console.log('Last ingredient:', allIngredients[allIngredients.length - 1]?.name)
      
      // Check for ingredients starting with Q, R, S, T, U, V, W, X, Y, Z
      const laterIngredients = allIngredients.filter(ing => 
        ing.name && /^[Q-Z]/i.test(ing.name)
      )
      console.log(`Ingredients starting with Q-Z: ${laterIngredients.length}`)
      if (laterIngredients.length > 0) {
        console.log('Sample later ingredients:', laterIngredients.slice(0, 5).map(ing => ing.name))
      }

      setCuisines(cuisinesData || [])
      setMealTypes(mealTypesData || [])
      setIngredients(allIngredients)

      // Pre-check pantry ingredients if user has them
      if (profileData && profileData.pantry_ingredients && profileData.pantry_ingredients.length > 0) {
        console.log('🔍 DEBUG: Loading pantry ingredients:', profileData.pantry_ingredients)
        
        // Group pantry ingredients by category
        const pantryProteins: number[] = []
        const pantryVegetables: number[] = []
        const pantryFruits: number[] = []
        const pantryGrains: number[] = []
        const pantryDairy: number[] = []
        const pantrySpices: number[] = []

        allIngredients.forEach(ingredient => {
          if (profileData.pantry_ingredients?.includes(ingredient.ingredient_id)) {
            switch (ingredient.category_id) {
              case 1: pantryProteins.push(ingredient.ingredient_id); break
              case 2: pantryVegetables.push(ingredient.ingredient_id); break
              case 3: pantryFruits.push(ingredient.ingredient_id); break
              case 4: pantryGrains.push(ingredient.ingredient_id); break
              case 7: pantryDairy.push(ingredient.ingredient_id); break
              case 6: pantrySpices.push(ingredient.ingredient_id); break
            }
          }
        })

        // Update filters with pantry ingredients
        setFilters(prev => ({
          ...prev,
          proteins: pantryProteins,
          vegetables: pantryVegetables,
          fruits: pantryFruits,
          grains: pantryGrains,
          dairy: pantryDairy,
          spices: pantrySpices
        }))

        console.log('🔍 DEBUG: Set pantry filters:', {
          proteins: pantryProteins,
          vegetables: pantryVegetables,
          fruits: pantryFruits,
          grains: pantryGrains,
          dairy: pantryDairy,
          spices: pantrySpices
        })
      }

      // Don't load any recipes initially - wait for user to select ingredients
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }


  const searchRecipeTitles = async (query: string) => {
    console.log('🔍 DEBUG: searchRecipeTitles called with:', query)
    
    try {
      setLoading(true)
      
      // Clean the query for title search
      const cleanQuery = query
        .toLowerCase()
        .replace(/give me recipes? for/gi, '')
        .replace(/recipes? for/gi, '')
        .replace(/how to make/gi, '')
        .replace(/how to cook/gi, '')
        .trim()
      
      console.log('🔍 DEBUG: Cleaned query for title search:', cleanQuery)
      
      // Search user recipes by title using ilike for better compatibility
      const { data: userRecipes, error: userError } = await supabase
        .from('user_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name)
        `)
        .ilike('title', `%${cleanQuery}%`)
        .eq('user_id', (await getCurrentUser())?.id)
        .limit(20)
      
      if (userError) {
        console.error('Error searching user recipes by title:', userError)
      }
      
      // Search global recipes by title using ilike for better compatibility
      const { data: globalRecipes, error: globalError } = await supabase
        .from('global_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name)
        `)
        .ilike('title', `%${cleanQuery}%`)
        .eq('is_published', true)
        .limit(20)
      
      if (globalError) {
        console.error('Error searching global recipes by title:', globalError)
      }
      
      const userRecipesData = (userRecipes || []).map(recipe => ({ ...recipe, source: 'user' }))
      const globalRecipesData = (globalRecipes || []).map(recipe => ({ ...recipe, source: 'global' }))
      
      console.log('🔍 DEBUG: Found user recipes by title:', userRecipesData.length)
      console.log('🔍 DEBUG: Found global recipes by title:', globalRecipesData.length)
      
      // Set the results
      setUserRecipes(userRecipesData)
      setGlobalRecipes(globalRecipesData)
      
      // If no results found, trigger OpenAI fallback
      if (userRecipesData.length === 0 && globalRecipesData.length === 0) {
        console.log('🔍 DEBUG: No recipe title matches found, triggering OpenAI fallback')
        await generateRecipesWithOpenAI(query)
      } else {
        // Clear session storage since we found results
        sessionStorage.removeItem('aiSearchQuery')
        sessionStorage.removeItem('aiSearchSource')
        console.log('🔍 DEBUG: Cleared session storage after finding recipe title matches')
      }
      
    } catch (error) {
      console.error('Error in searchRecipeTitles:', error)
      // Fallback to OpenAI on error
      await generateRecipesWithOpenAI(query)
    } finally {
      setLoading(false)
    }
  }

  const parseSearchQuery = (query: string) => {
    console.log('🔍 DEBUG: parseSearchQuery called with:', query)
    if (!query.trim()) {
      console.log('🔍 DEBUG: Empty query, returning')
      return
    }

    // Use a more sophisticated approach inspired by Detailed Ingredient Analysis
    let cleanQuery = query.toLowerCase()
    console.log('🔍 DEBUG: Initial cleanQuery:', cleanQuery)
    
    // Remove common question words and phrases (more comprehensive)
    cleanQuery = cleanQuery
      .replace(/give me recipes? for/gi, '')
      .replace(/what can i make with/gi, '')
      .replace(/what can i cook with/gi, '')
      .replace(/what can i do with/gi, '')
      .replace(/find a recipe that uses?/gi, '')
      .replace(/recipe that uses?/gi, '')
      .replace(/recipes? with/gi, '')
      .replace(/how to make/gi, '')
      .replace(/how to cook/gi, '')
      .replace(/using/gi, '')
      .replace(/with/gi, '')
      .replace(/and/gi, ',')
      .replace(/or/gi, ',')
      .replace(/,\s*,/g, ',') // Remove double commas
      .trim()
    
    console.log('🔍 DEBUG: After question word removal:', cleanQuery)
    
    // Handle recipe names like "spaghetti alla vongole" by splitting on common separators
    let ingredientNames: string[] = []
    
    // First, try to split by commas
    if (cleanQuery.includes(',')) {
      ingredientNames = cleanQuery.split(',')
    } else {
      // For single recipe names, try to extract key ingredients
      // Handle common recipe name patterns
      if (cleanQuery.includes(' alla ') || cleanQuery.includes(' al ')) {
        // Italian recipes like "spaghetti alla vongole" -> ["spaghetti", "vongole"]
        const parts = cleanQuery.split(/\s+(?:alla|al|con|with)\s+/)
        ingredientNames = parts
      } else if (cleanQuery.includes(' with ')) {
        // English recipes like "chicken with rice" -> ["chicken", "rice"]
        ingredientNames = cleanQuery.split(/\s+with\s+/)
      } else if (cleanQuery.includes(' and ')) {
        // Recipes like "chicken and rice" -> ["chicken", "rice"]
        ingredientNames = cleanQuery.split(/\s+and\s+/)
      } else {
        // Single ingredient or recipe name
        ingredientNames = [cleanQuery]
      }
    }
    
    // Clean up each ingredient using Detailed Ingredient Analysis approach
    const cleanedIngredients = ingredientNames
      .map(name => {
        console.log('🔍 DEBUG: Processing ingredient name:', name)
        // Clean each ingredient name like the Detailed Ingredient Analysis does
        const cleaned = name
          .trim()
          // Remove measurements and numbers
          .replace(/\b\d+([/-]\d+)?(\s*(inch|inches|cm|centimeter|centimeters|mm))?\b/g, '')
          // Remove volume units
          .replace(/\b(cup|cups|c|tablespoon|tablespoons|tbsp|tbs|tb|teaspoon|teaspoons|tsp|ts|fluid\s*ounce|fluid\s*ounces|fl\.?\s*oz|pint|pints|pt|quart|quarts|qt|gallon|gallons|gal|milliliter|milliliters|millilitre|millilitres|ml|liter|liters|litre|litres|l|deciliter|deciliters|dl)\b/gi, '')
          // Remove weight units
          .replace(/\b(pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|gramme|grammes|g|kilogram|kilograms|kg|milligram|milligrams|mg)\b/gi, '')
          // Remove portion/count units
          .replace(/\b(clove|cloves|stalk|stalks|stick|sticks|piece|pieces|chunk|chunks|strip|strips|wedge|wedges|slice|slices|head|heads|bunch|bunches|sprig|sprigs|leaf|leaves|bulb|bulbs|can|cans|jar|jars|package|packages|pkg|box|boxes|bag|bags|container|containers)\b/gi, '')
          // Remove cutting/prep styles
          .replace(/\b(diced|chopped|peeled|minced|sliced|grated|shredded|crushed|mashed|pureed|ground|crumbled|julienned|ribboned|cubed|halved|quartered|sectioned|segmented|torn|broken)\b/gi, '')
          // Remove size descriptors
          .replace(/\b(large|medium|small|mini|baby|jumbo|giant|extra-large|x-large|xl|extra-small|x-small|xs|bite-sized|bite-size)\b/gi, '')
          // Remove color descriptors
          .replace(/\b(red|green|yellow|orange|purple|white|black|brown|golden|dark|light|pale)\b/gi, '')
          // Remove cooking states
          .replace(/\b(fresh|freshly|dried|frozen|defrosted|thawed|bottled|packaged|jarred|smoked|cured|aged)\b/gi, '')
          // Remove cooking methods
          .replace(/\b(raw|cooked|uncooked|precooked|blanched|parboiled|steamed|boiled|simmered|poached|roasted|baked|grilled|broiled|fried|sauteed|sautéed|pan-fried|deep-fried|stir-fried|braised|stewed|caramelized)\b/gi, '')
          // Remove quality/source descriptors
          .replace(/\b(organic|non-organic|natural|wild|farm-raised|free-range|grass-fed|hormone-free|antibiotic-free|gmo-free|non-gmo|gluten-free|low-sodium|no-salt|unsalted|salted|sweetened|unsweetened|sugar-free)\b/gi, '')
          // Remove conjunctions and articles
          .replace(/\b(and|or|with|without|plus|a|an|the|of|from|for|on|at|by)\b/gi, '')
          // Remove parenthetical content
          .replace(/\([^)]*\)/g, '')
          // Remove bracket content
          .replace(/\[[^\]]*\]/g, '')
          // Remove question marks and other punctuation
          .replace(/[,\-–—&/?!]/g, ' ')
          // Collapse multiple spaces into one
          .replace(/\s+/g, ' ')
          // Final trim
          .trim()
        
        console.log('🔍 DEBUG: Cleaned ingredient:', name, '→', cleaned)
        return cleaned
      })
      .filter(name => name.length > 0)
      .filter(name => !['a', 'an', 'the', 'some', 'any'].includes(name)) // Remove articles

    console.log('🔍 DEBUG: Final parsed ingredient names:', cleanedIngredients)
    
    // Debug: Check if we have common ingredients
    const commonIngredients = ['chicken', 'rice', 'beef', 'pork', 'fish', 'pasta', 'bread']
    const foundCommon = ingredients.filter(ing => 
      commonIngredients.some(common => ing.name.toLowerCase().includes(common))
    )
    console.log('🔍 DEBUG: Common ingredients found in database:', foundCommon.map(i => i.name))

    // Find matching ingredients in the database (optimized)
    const matchedIngredients: { [key: string]: number[] } = {
      proteins: [],
      vegetables: [],
      fruits: [],
      grains: [],
      dairy: [],
      spices: []
    }

    // Use a more flexible matching approach
    console.log('🔍 DEBUG: Starting ingredient matching with', cleanedIngredients.length, 'search terms')
    console.log('🔍 DEBUG: Total ingredients in database:', ingredients.length)
    
    cleanedIngredients.forEach(searchName => {
      console.log('🔍 DEBUG: Searching for ingredient:', searchName)
      
      const foundIngredients = ingredients.filter(ingredient => {
        if (!ingredient || !ingredient.name || !ingredient.category_id || !ingredient.ingredient_id) {
          console.log('🔍 DEBUG: Skipping invalid ingredient:', ingredient)
          return false
        }
        
        const ingredientName = ingredient.name.toLowerCase()
        const searchTerm = searchName.toLowerCase()
        
        // More precise matching with confidence scoring
        let confidence = 0
        let matchType = ''
        
        // Exact match (highest confidence)
        if (ingredientName === searchTerm) {
          confidence = 1.0
          matchType = 'exact'
        }
        // Word boundary match (high confidence) - ingredient contains the search term as a complete word
        else if (new RegExp(`\\b${searchTerm}\\b`).test(ingredientName)) {
          confidence = 0.9
          matchType = 'word_boundary'
        }
        // Starts with match (good confidence) - ingredient starts with the search term
        else if (ingredientName.startsWith(searchTerm)) {
          confidence = 0.8
          matchType = 'starts_with'
        }
        // Ends with match (good confidence) - ingredient ends with the search term
        else if (ingredientName.endsWith(searchTerm)) {
          confidence = 0.8
          matchType = 'ends_with'
        }
        // Contains match (medium confidence) - but only if search term is at least 3 characters
        else if (searchTerm.length >= 3 && ingredientName.includes(searchTerm)) {
          confidence = 0.6
          matchType = 'contains'
        }
        // Plural/singular match (medium confidence)
        else if (searchTerm.endsWith('s') && ingredientName === searchTerm.slice(0, -1)) {
          confidence = 0.7
          matchType = 'singular'
        }
        else if (ingredientName.endsWith('s') && searchTerm === ingredientName.slice(0, -1)) {
          confidence = 0.7
          matchType = 'plural'
        }
        // Partial word match (low confidence) - only for longer search terms
        else if (searchTerm.length >= 4 && ingredientName.split(' ').some((word: string) => word.includes(searchTerm))) {
          confidence = 0.4
          matchType = 'partial_word'
        }
        
        // Only accept matches with confidence >= 0.6 (medium confidence or higher)
        let matches = confidence >= 0.6
        
        // Additional filtering to prevent false positives
        if (matches) {
          // For very short search terms (1-2 characters), require higher confidence
          if (searchTerm.length <= 2 && confidence < 0.8) {
            matches = false
          }
          
          // For compound ingredients, make sure the match is meaningful
          if (ingredientName.includes(' ') && matchType === 'contains') {
            // If it's a compound ingredient and we're doing a contains match,
            // make sure the search term is a significant portion of the ingredient
            const searchTermRatio = searchTerm.length / ingredientName.length
            if (searchTermRatio < 0.3) { // Search term should be at least 30% of ingredient name
              matches = false
            }
          }
          
          // Reject matches that are clearly unrelated (e.g., "spaghetti squash" for "spaghetti alla vongole")
          if (matchType === 'contains' && ingredientName.includes(' ') && searchTerm.length >= 4) {
            // Check if the ingredient contains other major words that suggest it's a different type
            const ingredientWords = ingredientName.split(' ')
            const hasOtherMajorWords = ingredientWords.some((word: string) => 
              word.length >= 4 && word !== searchTerm && 
              !['fresh', 'dried', 'cooked', 'raw', 'organic', 'large', 'small', 'medium'].includes(word)
            )
            if (hasOtherMajorWords) {
              // This might be a false positive, require higher confidence
              if (confidence < 0.8) {
                matches = false
              }
            }
          }
        }
        
        if (matches) {
          console.log('🔍 DEBUG: MATCH FOUND:', ingredientName, 'matches', searchTerm, {
            confidence: confidence.toFixed(2),
            matchType
          })
        }
        
        return matches
      })

      console.log(`🔍 DEBUG: Found ${foundIngredients.length} matches for "${searchName}":`, foundIngredients.map(i => i.name))

      foundIngredients.forEach(ingredient => {
        if (ingredient && ingredient.category_id && ingredient.ingredient_id) {
          const categoryKey = getCategoryKey(ingredient.category_id)
          console.log('🔍 DEBUG: Adding ingredient to category:', ingredient.name, '→', categoryKey)
          if (categoryKey && !matchedIngredients[categoryKey].includes(ingredient.ingredient_id)) {
            matchedIngredients[categoryKey].push(ingredient.ingredient_id)
          }
        }
      })
    })

    console.log('🔍 DEBUG: Final matched ingredients by category:', matchedIngredients)

    // Update filters with matched ingredients (batch update)
    setFilters(prev => {
      console.log('🔍 DEBUG: Previous filters:', prev)
      const newFilters = { ...prev }
      Object.keys(matchedIngredients).forEach(category => {
        const categoryKey = category as keyof typeof matchedIngredients
        const newCategoryIngredients = [...(prev as any)[categoryKey], ...matchedIngredients[categoryKey]]
        ;(newFilters as any)[categoryKey] = newCategoryIngredients
        console.log(`🔍 DEBUG: Updated ${categoryKey}:`, newCategoryIngredients)
      })
      console.log('🔍 DEBUG: New filters:', newFilters)
      return newFilters
    })

    return matchedIngredients
  }

  const getCategoryKey = (categoryId: number) => {
    const categoryMap: { [key: number]: string } = {
      1: 'proteins',
      2: 'vegetables', 
      3: 'fruits',
      4: 'grains',
      7: 'dairy',
      6: 'spices'
    }
    return categoryMap[categoryId]
  }

  const searchRecipes = async () => {
    console.log('🔍 DEBUG: searchRecipes() called')
    setLoading(true)
    try {
      // Check if search query contains natural language ingredient search
      if (searchQuery.trim() && searchQuery.toLowerCase().includes('recipe')) {
        console.log('🔍 DEBUG: Detected natural language search:', searchQuery)
        parseSearchQuery(searchQuery)
        // Clear the search query after processing
        setSearchQuery('')
      }

      // Get all selected ingredients
      const allSelectedIngredients = [
        ...filters.proteins,
        ...filters.vegetables,
        ...filters.fruits,
        ...filters.grains,
        ...filters.dairy,
        ...filters.spices
      ]

      // If no ingredients selected, clear recipes
      if (allSelectedIngredients.length === 0) {
        setUserRecipes([])
        setGlobalRecipes([])
        return
      }

      await performIngredientSearch()
    } catch (error) {
      console.error('Error searching recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const performIngredientSearch = async () => {
    console.log('🚀 NEW SEARCH LOGIC EXECUTING - CACHE BUSTED v1.2.1')
    try {
      // Get all selected ingredients
      const allSelectedIngredients = [
        ...filters.proteins,
        ...filters.vegetables,
        ...filters.fruits,
        ...filters.grains,
        ...filters.dairy,
        ...filters.spices
      ]

      console.log('🔍 DEBUG: All selected ingredients:', allSelectedIngredients)

      // If no ingredients selected, clear recipes
      if (allSelectedIngredients.length === 0) {
        console.log('🔍 DEBUG: No ingredients selected, clearing recipes and returning')
        setUserRecipes([])
        setGlobalRecipes([])
        return
      }

      console.log('🔍 DEBUG: Searching for ingredients:', allSelectedIngredients)
      console.log('🔍 DEBUG: Starting ingredient search...', new Date().toISOString())

      // Step 1: Find recipes that contain any of the selected ingredients
      // Search user recipes through user_recipe_ingredients_detail
      const { data: userIngredientMatches, error: userIngredientError } = await supabase
        .from('user_recipe_ingredients_detail')
        .select(`
          user_recipe_id,
          ingredient_id,
          original_text,
          matched_term
        `)
        .in('ingredient_id', allSelectedIngredients)

      if (userIngredientError) {
        console.error('Error searching user ingredient details:', userIngredientError)
      }

      // Search global recipes through global_recipe_ingredients_detail
      const { data: globalIngredientMatches, error: globalIngredientError } = await supabase
        .from('global_recipe_ingredients_detail')
        .select(`
          recipe_id,
          ingredient_id,
          original_text,
          matched_term
        `)
        .in('ingredient_id', allSelectedIngredients)

      if (globalIngredientError) {
        console.error('Error searching global ingredient details:', globalIngredientError)
      }

      console.log('User ingredient matches:', userIngredientMatches?.length || 0)
      console.log('Global ingredient matches:', globalIngredientMatches?.length || 0)
      console.log('NEW SEARCH LOGIC RUNNING - TIMESTAMP:', new Date().toISOString())

      // Step 2: Get unique recipe IDs
      const userRecipeIds = [...new Set(userIngredientMatches?.map(match => match.user_recipe_id) || [])]
      const globalRecipeIds = [...new Set(globalIngredientMatches?.map(match => match.recipe_id) || [])]

      console.log('User recipe IDs:', userRecipeIds)
      console.log('Global recipe IDs:', globalRecipeIds)

      // Step 3: Fetch full recipe data for matching recipes
      let userRecipesData: any[] = []
      let globalRecipesData: any[] = []

      // Fetch user recipes if we have matches
      if (userRecipeIds.length > 0) {
        let userQuery = supabase
          .from('user_recipes')
          .select(`
            *,
            cuisine:cuisines(name),
            meal_type:meal_types(name)
          `)
          .in('user_recipe_id', userRecipeIds)

        // Apply filters to user recipes
        if (filters.cuisine_id) {
          userQuery = userQuery.eq('cuisine_id', filters.cuisine_id)
        }
        if (filters.meal_type_id) {
          userQuery = userQuery.eq('meal_type_id', filters.meal_type_id)
        }
        if (filters.difficulty) {
          userQuery = userQuery.eq('difficulty', filters.difficulty)
        }
        // Only do full-text search if it's not an AI search query (which contains question words)
        if (searchQuery.trim() && 
            !searchQuery.toLowerCase().includes('recipe') && 
            !searchQuery.toLowerCase().includes('what can i make') &&
            !searchQuery.toLowerCase().includes('what can i cook') &&
            !searchQuery.toLowerCase().includes('how to')) {
          userQuery = userQuery.textSearch('title', searchQuery.trim())
        }

        console.log('🔍 DEBUG: About to fetch user recipes with query')
        const { data: userRecipes, error: userRecipesError } = await userQuery

        if (userRecipesError) {
          console.error('🔍 DEBUG: Error fetching user recipes:', userRecipesError)
        } else {
          console.log('🔍 DEBUG: Successfully fetched user recipes:', userRecipes?.length || 0)
          userRecipesData = (userRecipes || []).map(recipe => ({ ...recipe, source: 'user' }))
        }
      }

      // Fetch global recipes if we have matches
      if (globalRecipeIds.length > 0) {
        let globalQuery = supabase
          .from('global_recipes')
          .select(`
            *,
            cuisine:cuisines(name),
            meal_type:meal_types(name)
          `)
          .in('recipe_id', globalRecipeIds)
          .eq('is_published', true)

        // Apply filters to global recipes
        if (filters.cuisine_id) {
          globalQuery = globalQuery.eq('cuisine_id', filters.cuisine_id)
        }
        if (filters.meal_type_id) {
          globalQuery = globalQuery.eq('meal_type_id', filters.meal_type_id)
        }
        if (filters.difficulty) {
          globalQuery = globalQuery.eq('difficulty', filters.difficulty)
        }
        // Only do full-text search if it's not an AI search query (which contains question words)
        if (searchQuery.trim() && 
            !searchQuery.toLowerCase().includes('recipe') && 
            !searchQuery.toLowerCase().includes('what can i make') &&
            !searchQuery.toLowerCase().includes('what can i cook') &&
            !searchQuery.toLowerCase().includes('how to')) {
          globalQuery = globalQuery.textSearch('title', searchQuery.trim())
        }

        console.log('🔍 DEBUG: About to fetch global recipes with query')
        const { data: globalRecipes, error: globalRecipesError } = await globalQuery

        if (globalRecipesError) {
          console.error('🔍 DEBUG: Error fetching global recipes:', globalRecipesError)
        } else {
          console.log('🔍 DEBUG: Successfully fetched global recipes:', globalRecipes?.length || 0)
          globalRecipesData = (globalRecipes || []).map(recipe => ({ ...recipe, source: 'global' }))
        }
      }

      console.log('Fetched user recipes:', userRecipesData.length)
      console.log('Fetched global recipes:', globalRecipesData.length)

      // Step 4: Count ingredient matches for each recipe
      const scoredUserRecipes = userRecipesData.map(recipe => {
        // Count how many of the selected ingredients this recipe contains
        const recipeMatches = userIngredientMatches?.filter(match => 
          match.user_recipe_id === recipe.user_recipe_id && 
          allSelectedIngredients.includes(match.ingredient_id)
        ) || []

        const ingredientMatches = recipeMatches.length
        const matchPercentage = allSelectedIngredients.length > 0 
          ? (ingredientMatches / allSelectedIngredients.length) * 100 
          : 0

        // Bonus points for exact matches
        let bonusScore = 0
        if (filters.cuisine_id && recipe.cuisine_id === filters.cuisine_id) {
          bonusScore += 10
        }
        if (filters.meal_type_id && recipe.meal_type_id === filters.meal_type_id) {
          bonusScore += 10
        }
        if (filters.difficulty && recipe.difficulty === filters.difficulty) {
          bonusScore += 5
        }

        return {
          ...recipe,
          ingredientMatches,
          matchPercentage,
          totalScore: matchPercentage + bonusScore,
          matchedIngredients: recipeMatches
        }
      })

      const scoredGlobalRecipes = globalRecipesData.map(recipe => {
        // Count how many of the selected ingredients this recipe contains
        const recipeMatches = globalIngredientMatches?.filter(match => 
          match.recipe_id === recipe.recipe_id && 
          allSelectedIngredients.includes(match.ingredient_id)
        ) || []

        const ingredientMatches = recipeMatches.length
        const matchPercentage = allSelectedIngredients.length > 0 
          ? (ingredientMatches / allSelectedIngredients.length) * 100 
          : 0

        // Bonus points for exact matches
        let bonusScore = 0
        if (filters.cuisine_id && recipe.cuisine_id === filters.cuisine_id) {
          bonusScore += 10
        }
        if (filters.meal_type_id && recipe.meal_type_id === filters.meal_type_id) {
          bonusScore += 10
        }
        if (filters.difficulty && recipe.difficulty === filters.difficulty) {
          bonusScore += 5
        }

        return {
          ...recipe,
          ingredientMatches,
          matchPercentage,
          totalScore: matchPercentage + bonusScore,
          matchedIngredients: recipeMatches
        }
      })

      // Filter out recipes with 0 matches and sort by ingredient matches
      const filteredUserRecipes = scoredUserRecipes
        .filter(r => r.ingredientMatches > 0)
        .sort((a, b) => {
          if (b.ingredientMatches !== a.ingredientMatches) {
            return b.ingredientMatches - a.ingredientMatches
          }
          return b.totalScore - a.totalScore
        })
      
      const filteredGlobalRecipes = scoredGlobalRecipes
        .filter(r => r.ingredientMatches > 0)
        .sort((a, b) => {
          if (b.ingredientMatches !== a.ingredientMatches) {
            return b.ingredientMatches - a.ingredientMatches
          }
          return b.totalScore - a.totalScore
        })

      console.log('Final user recipes:', filteredUserRecipes.length)
      console.log('Final global recipes:', filteredGlobalRecipes.length)

      setUserRecipes(filteredUserRecipes)
      setGlobalRecipes(filteredGlobalRecipes)

      // If no results found and this was an AI search, try OpenAI generation
      if (filteredUserRecipes.length === 0 && filteredGlobalRecipes.length === 0 && searchQuery.trim()) {
        console.log('🔍 DEBUG: No database results found, checking if this was an AI search...')
        console.log('🔍 DEBUG: searchQuery:', searchQuery)
        const urlParams = new URLSearchParams(window.location.search)
        console.log('🔍 DEBUG: URL params:', Object.fromEntries(urlParams.entries()))
        console.log('🔍 DEBUG: aiSearch param:', urlParams.get('aiSearch'))
        
        if (urlParams.get('aiSearch') === 'true') {
          console.log('🔍 DEBUG: AI search with no database results, generating recipes with OpenAI...')
          await generateRecipesWithOpenAI(searchQuery)
          // Clear session storage after using it for fallback
          sessionStorage.removeItem('aiSearchQuery')
          console.log('🔍 DEBUG: Cleared aiSearchQuery from sessionStorage after OpenAI fallback')
        } else {
          console.log('🔍 DEBUG: Not an AI search, no fallback to OpenAI')
        }
      } else {
        console.log('🔍 DEBUG: Found database results or no search query, no OpenAI fallback needed')
        console.log('🔍 DEBUG: User recipes:', filteredUserRecipes.length, 'Global recipes:', filteredGlobalRecipes.length)
        // Clear session storage if we found database results
        if (filteredUserRecipes.length > 0 || filteredGlobalRecipes.length > 0) {
          sessionStorage.removeItem('aiSearchQuery')
          console.log('🔍 DEBUG: Cleared aiSearchQuery from sessionStorage after finding database results')
        }
      }
    } catch (error) {
      console.error('Error searching recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateRecipesWithOpenAI = async (query: string) => {
    try {
      console.log('Generating recipes with OpenAI for query:', query)
      
      // Start AI loading with progress simulation
      setAiLoading(true)
      setAiLoadingProgress(0)
      setAiLoadingMessage('Chef Tony is thinking...')
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAiLoadingProgress(prev => {
          if (prev < 90) {
            const messages = [
              'Chef Tony is thinking...',
              'Searching our recipe database...',
              'Analyzing ingredients...',
              'Crafting perfect recipes...',
              'Adding final touches...'
            ]
            const messageIndex = Math.floor((prev / 90) * messages.length)
            setAiLoadingMessage(messages[messageIndex] || messages[messages.length - 1])
            return prev + Math.random() * 15
          }
          return prev
        })
      }, 500)
      
      const response = await fetch('/api/ai/generate-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      // Clear progress interval
      clearInterval(progressInterval)
      setAiLoadingProgress(100)
      setAiLoadingMessage('Almost ready...')

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recipes')
      }

      if (data.recipes && data.recipes.length > 0) {
        // Format the generated recipes for display
        const formattedRecipes = data.recipes.map((recipe: any) => {
          // Parse instructions from JSON-LD format
          const instructions = recipe.recipeInstructions?.map((step: any) => {
            if (typeof step === 'string') {
              return step
            } else if (step && step.text) {
              return step.text
            }
            return step
          }) || []

          // Parse ingredients from JSON-LD format
          const ingredients = recipe.recipeIngredient?.map((ing: string) => ({
            ingredient: { name: ing, category_id: 1 },
            raw_name: ing
          })) || []

          return {
            recipe_id: `ai_${Date.now()}_${Math.random()}`,
            title: recipe.name,
            description: recipe.description,
            image_url: recipe.image || '/placeholder-recipe.jpg',
            prep_time: recipe.prepTime,
            cook_time: recipe.cookTime,
            total_time: recipe.totalTime,
            servings: recipe.recipeYield,
            difficulty: 'Medium',
            cuisine: { name: recipe.recipeCuisine || 'International' },
            meal_type: { name: recipe.recipeCategory || 'Main Course' },
            ingredients: ingredients,
            instructions: instructions,
            nutrition: recipe.nutrition,
            rating: recipe.aggregateRating?.ratingValue || '4.5',
            source: 'AI Generated',
            matchPercentage: 100,
            ingredientMatches: 1,
            totalScore: 100
          }
        })
        
        setAiRecipes(formattedRecipes)
        setGlobalRecipes([])
        setUserRecipes([])
        
        // Store AI recipes in session storage for detail page access
        sessionStorage.setItem('aiRecipes', JSON.stringify(formattedRecipes))
        
        console.log('Generated and displayed', formattedRecipes.length, 'AI recipes')
      }
    } catch (error) {
      console.error('Error generating recipes with OpenAI:', error)
    } finally {
      // End loading state
      setTimeout(() => {
        setAiLoading(false)
        setAiLoadingProgress(0)
        setAiLoadingMessage('')
      }, 500)
    }
  }


  const addToCookbook = async (recipeId: number) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const recipe = [...userRecipes, ...globalRecipes, ...aiRecipes].find(r => r.recipe_id === recipeId)
      if (!recipe) return

      // Check if this is an AI-generated recipe
      const isAiGenerated = recipe.source === 'ai_generated' || recipe.recipe_id?.toString().startsWith('ai_')

      // Helper function to convert PT format to human readable
      const convertPTTime = (ptTime?: string) => {
        if (!ptTime) return null
        if (ptTime.startsWith('PT')) {
          const timeStr = ptTime.replace('PT', '')
          let hours = 0
          let minutes = 0
          
          const hourMatch = timeStr.match(/(\d+)H/)
          if (hourMatch) hours = parseInt(hourMatch[1])
          
          const minuteMatch = timeStr.match(/(\d+)M/)
          if (minuteMatch) minutes = parseInt(minuteMatch[1])
          
          if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`
          } else if (hours > 0) {
            return `${hours}h`
          } else if (minutes > 0) {
            return `${minutes}m`
          }
        }
        return ptTime // Return as-is if not PT format
      }

      // Create user recipe
      const { data: userRecipe, error: recipeError } = await supabase
        .from('user_recipes')
        .insert({
          user_id: user.id,
          recipe_id: isAiGenerated ? null : recipeId, // AI recipes don't reference global recipes
          title: recipe.title,
          description: recipe.description,
          image_url: recipe.image_url,
          cuisine_id: (recipe as any).cuisine_id,
          meal_type_id: (recipe as any).meal_type_id,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          prep_time: isAiGenerated ? convertPTTime(recipe.prep_time) : recipe.prep_time,
          cook_time: isAiGenerated ? convertPTTime(recipe.cook_time) : recipe.cook_time,
          total_time: isAiGenerated ? convertPTTime(recipe.total_time) : recipe.total_time,
          source_name: isAiGenerated ? 'AI Generated' : 'Global Cookbook',
          source_url: isAiGenerated ? null : `/finder`
        })
        .select()
        .single()

      if (recipeError) {
        console.error('Error adding recipe:', recipeError)
        return
      }

      // Handle ingredients differently for AI vs global recipes
      if (isAiGenerated) {
        // For AI-generated recipes, use the ingredients from the recipe object
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          const ingredientInserts = recipe.ingredients.map((ingredient: any) => {
            let rawName = ''
            let amount = ''
            let unit = ''
            
            if (typeof ingredient === 'string') {
              rawName = ingredient
            } else if (ingredient.name) {
              rawName = ingredient.name
              amount = ingredient.amount || ''
              unit = ingredient.unit || ''
            } else if (ingredient.raw_name) {
              rawName = ingredient.raw_name
              amount = ingredient.amount || ''
              unit = ingredient.unit || ''
            } else {
              rawName = String(ingredient)
            }
            
            return {
              user_recipe_id: userRecipe.user_recipe_id,
              raw_name: rawName,
              amount: amount,
              unit: unit,
              ingredient_id: null // AI recipes don't have ingredient mapping
            }
          })

          const { error: ingredientsError } = await supabase
            .from('user_recipe_ingredients')
            .insert(ingredientInserts)

          if (ingredientsError) {
            console.error('Error saving AI ingredients:', ingredientsError)
          }
        }
      } else {
        // For global recipes, copy ingredients from global_recipe_ingredients
        const { data: globalIngredients } = await supabase
          .from('global_recipe_ingredients')
          .select(`
            id,
            amount,
            unit,
            ingredients!inner(ingredient_id, name)
          `)
          .eq('recipe_id', recipeId)

        if (globalIngredients && globalIngredients.length > 0) {
        // Create a map to track global_ingredient_id → user_ingredient_id
        const ingredientIdMap = new Map()
        
        // Insert ingredients and get their new IDs
        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('user_recipe_ingredients')
          .insert(
            globalIngredients.map((ing: any) => ({
              user_recipe_id: userRecipe.user_recipe_id,
              raw_name: ing.ingredients.name, // Store as raw_name for consistency
              amount: ing.amount,
              unit: ing.unit
            }))
          )
          .select('id')

        if (ingredientsError) {
          console.error('Error copying ingredients:', ingredientsError)
        } else {
          // Map global IDs to new user IDs
          globalIngredients.forEach((globalIng: any, index: number) => {
            if (insertedIngredients && insertedIngredients[index]) {
              ingredientIdMap.set(globalIng.id, insertedIngredients[index].id)
            }
          })

          // Copy detail records from global_recipe_ingredients_detail
          const { data: globalDetails } = await supabase
            .from('global_recipe_ingredients_detail')
            .select('*')
            .eq('recipe_id', recipeId)

          if (globalDetails && globalDetails.length > 0) {
            const userDetails = globalDetails
              .filter((detail: any) => detail.global_recipe_ingredient_id) // Only copy if FK exists
              .map((detail: any) => ({
                user_recipe_id: userRecipe.user_recipe_id,
                user_recipe_ingredient_id: ingredientIdMap.get(detail.global_recipe_ingredient_id), // Map FK!
                ingredient_id: detail.ingredient_id,
                original_text: detail.original_text,
                matched_term: detail.matched_term,
                match_type: detail.match_type,
                matched_alias: detail.matched_alias
              }))
              .filter((detail: any) => detail.user_recipe_ingredient_id) // Only insert if mapping succeeded

            if (userDetails.length > 0) {
              const { error: detailsError } = await supabase
                .from('user_recipe_ingredients_detail')
                .insert(userDetails)

              if (detailsError) {
                console.error('Error copying detail records:', detailsError)
              } else {
                console.log(`Copied ${userDetails.length} detail records with FK preserved`)
              }
            }
          }
        }
        }
      }

      // Handle steps/instructions differently for AI vs global recipes
      if (isAiGenerated) {
        // For AI-generated recipes, use the instructions from the recipe object
        if (recipe.instructions && recipe.instructions.length > 0) {
          const stepInserts = recipe.instructions.map((instruction: any, index: number) => {
            let stepText = ''
            
            if (typeof instruction === 'string') {
              stepText = instruction
            } else if (instruction.text) {
              stepText = instruction.text
            } else {
              stepText = String(instruction)
            }
            
            return {
              user_recipe_id: userRecipe.user_recipe_id,
              step_number: index + 1,
              text: stepText
            }
          })

          const { error: stepsError } = await supabase
            .from('user_recipe_steps')
            .insert(stepInserts)

          if (stepsError) {
            console.error('Error saving AI instructions:', stepsError)
          }
        }
      } else {
        // For global recipes, copy steps from global_recipe_steps
        const { data: stepsData } = await supabase
          .from('global_recipe_steps')
          .select('step_number, text')
          .eq('recipe_id', recipeId)
          .order('step_number')

        if (stepsData && stepsData.length > 0) {
          const steps = stepsData.map(step => ({
            user_recipe_id: userRecipe.user_recipe_id,
            step_number: step.step_number,
            text: step.text
          }))

          await supabase
            .from('user_recipe_steps')
            .insert(steps)
        }
      }

      // Update the added count in the UI
      setGlobalRecipes(prev => prev.map(r => 
        r.recipe_id === recipeId 
          ? { ...r, added_count: (r.added_count || 0) + 1 }
          : r
      ))

      // Show success message (you could add a toast here)
      alert('Recipe added to your cookbook!')
    } catch (error) {
      console.error('Error adding recipe:', error)
    }
  }

  const handleFilterChange = (category: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [category]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      proteins: [],
      vegetables: [],
      fruits: [],
      grains: [],
      dairy: [],
      spices: []
    })
    setSearchQuery('')
    // Clear recipes instead of loading popular ones
    setUserRecipes([])
    setGlobalRecipes([])
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    return timeStr.replace('PT', '').replace('H', 'h ').replace('M', 'm').trim()
  }

  const getIngredientsByCategory = (categoryId: number, categoryKey: string) => {
    return ingredients.filter(ing => {
      const matchesCategory = ing && 
             ing.category_id !== null && 
             ing.category_id !== undefined && 
             ing.category_id === categoryId
      
      // If showAllIngredients is true for this category, show all
      // Otherwise, only show common ingredients
      if (showAllIngredients[categoryKey]) {
        return matchesCategory
      } else {
        return matchesCategory && ing.common === true
      }
    })
  }
  
  const toggleShowAllIngredients = (categoryKey: string) => {
    setShowAllIngredients(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }))
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Recipe Finder</h1>
            </div>
            
            {/* Search Criteria - Top Right */}
            <div className="flex items-center space-x-4">
              {/* Quick Search */}
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Button onClick={searchRecipes} disabled={loading} size="sm">
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
              
              {/* Basic Filters */}
              <div className="flex items-center space-x-2">
                <select
                  value={filters.cuisine_id || ''}
                  onChange={(e) => handleFilterChange('cuisine_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="border rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Any Cuisine</option>
                  {cuisines.map(cuisine => (
                    <option key={cuisine.cuisine_id} value={cuisine.cuisine_id}>
                      {cuisine.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filters.meal_type_id || ''}
                  onChange={(e) => handleFilterChange('meal_type_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="border rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Any Meal</option>
                  {mealTypes.map(mealType => (
                    <option key={mealType.meal_type_id} value={mealType.meal_type_id}>
                      {mealType.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filters.difficulty || ''}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value || undefined)}
                  className="border rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Any Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Very Hard">Very Hard</option>
                </select>
                
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Chef Tony Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ChefOuiOui />
            </div>
          </div>

          {/* Ingredient Selection */}
          <div className="lg:col-span-2">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Select Ingredients</span>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Proteins */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => toggleCategory('proteins')}
                          className="flex items-center text-left font-medium text-sm text-gray-700 hover:text-gray-900"
                        >
                          <span>Proteins ({getIngredientsByCategory(1, 'proteins').length})</span>
                          <span className="text-xs ml-2">
                            {expandedCategories.proteins ? '▼' : '▶'}
                          </span>
                        </button>
                        <Button
                          onClick={() => toggleShowAllIngredients('proteins')}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          {showAllIngredients.proteins ? 'Common' : 'All'}
                        </Button>
                      </div>
                      {expandedCategories.proteins && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(1, 'proteins').map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.proteins.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newProteins = e.target.checked
                                    ? [...filters.proteins, ingredient.ingredient_id]
                                    : filters.proteins.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('proteins', newProteins)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vegetables */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => toggleCategory('vegetables')}
                          className="flex items-center text-left font-medium text-sm text-gray-700 hover:text-gray-900"
                        >
                          <span>Vegetables ({getIngredientsByCategory(2, 'vegetables').length})</span>
                          <span className="text-xs ml-2">
                            {expandedCategories.vegetables ? '▼' : '▶'}
                          </span>
                        </button>
                        <Button
                          onClick={() => toggleShowAllIngredients('vegetables')}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          {showAllIngredients.vegetables ? 'Common' : 'All'}
                        </Button>
                      </div>
                      {expandedCategories.vegetables && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(2, 'vegetables').map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.vegetables.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newVegetables = e.target.checked
                                    ? [...filters.vegetables, ingredient.ingredient_id]
                                    : filters.vegetables.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('vegetables', newVegetables)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fruits */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => toggleCategory('fruits')}
                          className="flex items-center text-left font-medium text-sm text-gray-700 hover:text-gray-900"
                        >
                          <span>Fruits ({getIngredientsByCategory(3, 'fruits').length})</span>
                          <span className="text-xs ml-2">
                            {expandedCategories.fruits ? '▼' : '▶'}
                          </span>
                        </button>
                        <Button
                          onClick={() => toggleShowAllIngredients('fruits')}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          {showAllIngredients.fruits ? 'Common' : 'All'}
                        </Button>
                      </div>
                      {expandedCategories.fruits && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(3, 'fruits').map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.fruits.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newFruits = e.target.checked
                                    ? [...filters.fruits, ingredient.ingredient_id]
                                    : filters.fruits.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('fruits', newFruits)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Grains */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => toggleCategory('grains')}
                          className="flex items-center text-left font-medium text-sm text-gray-700 hover:text-gray-900"
                        >
                          <span>Grains ({getIngredientsByCategory(4, 'grains').length})</span>
                          <span className="text-xs ml-2">
                            {expandedCategories.grains ? '▼' : '▶'}
                          </span>
                        </button>
                        <Button
                          onClick={() => toggleShowAllIngredients('grains')}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          {showAllIngredients.grains ? 'Common' : 'All'}
                        </Button>
                      </div>
                      {expandedCategories.grains && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(4, 'grains').map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.grains.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newGrains = e.target.checked
                                    ? [...filters.grains, ingredient.ingredient_id]
                                    : filters.grains.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('grains', newGrains)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dairy */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => toggleCategory('dairy')}
                          className="flex items-center text-left font-medium text-sm text-gray-700 hover:text-gray-900"
                        >
                          <span>Dairy ({getIngredientsByCategory(7, 'dairy').length})</span>
                          <span className="text-xs ml-2">
                            {expandedCategories.dairy ? '▼' : '▶'}
                          </span>
                        </button>
                        <Button
                          onClick={() => toggleShowAllIngredients('dairy')}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          {showAllIngredients.dairy ? 'Common' : 'All'}
                        </Button>
                      </div>
                      {expandedCategories.dairy && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(7, 'dairy').map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.dairy.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newDairy = e.target.checked
                                    ? [...filters.dairy, ingredient.ingredient_id]
                                    : filters.dairy.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('dairy', newDairy)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Spices */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => toggleCategory('spices')}
                          className="flex items-center text-left font-medium text-sm text-gray-700 hover:text-gray-900"
                        >
                          <span>Spices ({getIngredientsByCategory(6, 'spices').length})</span>
                          <span className="text-xs ml-2">
                            {expandedCategories.spices ? '▼' : '▶'}
                          </span>
                        </button>
                        <Button
                          onClick={() => toggleShowAllIngredients('spices')}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          {showAllIngredients.spices ? 'Common' : 'All'}
                        </Button>
                      </div>
                      {expandedCategories.spices && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(6, 'spices').map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.spices.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newSpices = e.target.checked
                                    ? [...filters.spices, ingredient.ingredient_id]
                                    : filters.spices.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('spices', newSpices)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {loading ? 'Searching...' : 
                 aiLoading ? 'Chef Tony is working...' : 
                 `${userRecipes.length + globalRecipes.length + aiRecipes.length} Recipes Found`}
              </h2>
              <p className="text-gray-600">
                {aiLoading ? 'AI is crafting personalized recipes just for you' : 
                 'Discover amazing recipes from your cookbook and our global collection'}
              </p>
            </div>

            {/* My Cookbook Section - Top Right */}
            {userRecipes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <ChefHat className="w-5 h-5 mr-2 text-orange-600" />
                  My Cookbook ({userRecipes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userRecipes.map((recipe) => (
                    <RecipeCard
                      key={`user-${recipe.user_recipe_id || recipe.recipe_id}`}
                      recipe={recipe as any}
                      onAddToCookbook={addToCookbook}
                      showAddButton={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Global Recipes Section - Bottom Right */}
            {globalRecipes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Global Recipes ({globalRecipes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {globalRecipes.map((recipe) => (
                    <RecipeCard
                      key={`global-${recipe.recipe_id}`}
                      recipe={recipe as any}
                      onAddToCookbook={addToCookbook}
                      openInNewWindow={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* AI Search Results Section */}
            {aiRecipes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  AI Search Results ({aiRecipes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {aiRecipes.map((recipe) => (
                    <RecipeCard
                      key={`ai-${recipe.recipe_id}`}
                      recipe={recipe as any}
                      onAddToCookbook={addToCookbook}
                      isAiGenerated={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* AI Loading Indicator */}
            {aiLoading && (
              <Card className="text-center py-12 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                <CardContent>
                  <div className="flex flex-col items-center space-y-6">
                    {/* Spinning Chef Hat */}
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center animate-spin">
                        <ChefHat className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full opacity-20 animate-ping"></div>
                    </div>
                    
                    {/* Loading Message */}
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-orange-900 mb-2">
                        {aiLoadingMessage}
                      </h3>
                      <p className="text-orange-700 text-sm">
                        Chef Tony is crafting the perfect recipes for you...
                      </p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full max-w-md">
                      <div className="flex justify-between text-sm text-orange-600 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(aiLoadingProgress)}%</span>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${aiLoadingProgress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Fun cooking tips while loading */}
                    <div className="text-center max-w-md">
                      <p className="text-orange-600 text-sm italic">
                        💡 Did you know? The secret to great cooking is patience and love!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {userRecipes.length === 0 && globalRecipes.length === 0 && aiRecipes.length === 0 && !loading && !aiLoading && (
              <Card className="text-center py-12">
                <CardContent>
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No recipes found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
