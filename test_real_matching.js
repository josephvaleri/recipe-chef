// Test the real database matching for recipe 658
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRealDatabaseMatching() {
  try {
    console.log('🔍 Testing REAL database matching for recipe 658...')
    
    // Get the actual ingredients from your database
    const { data: allIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select(`
        ingredient_id,
        name,
        category_id,
        ingredient_categories(name)
      `)
    
    if (ingredientsError) {
      console.error('Error loading ingredients:', ingredientsError)
      return
    }
    
    console.log(`📊 Loaded ${allIngredients.length} REAL ingredients from database`)
    
    // Test ingredients from recipe 658
    const testIngredients = [
      '1 Carrot, Diced',
      '1 Onion, Peeled & Diced', 
      '1 Stalk Celery, Diced',
      '4 Tablespoons Chopped Pancetta',
      '3 Cloves Garlic, Peeled & Minced'
    ]
    
    for (const rawIngredient of testIngredients) {
      console.log(`\n🧪 Testing: "${rawIngredient}"`)
      console.log('─'.repeat(50))
      
      const rawName = rawIngredient.toLowerCase().trim()
      
      // Clean the raw name - remove common descriptors
      const cleanRawName = rawName
        .replace(/\b\d+\b/g, '') // Remove numbers
        .replace(/\b(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|diced|chopped|peeled|minced|sliced|grated|shredded|crushed|whole|large|medium|small|fresh|dried|frozen|canned|organic|raw|cooked|roasted|grilled|fried|boiled|steamed)\b/g, '')
        .replace(/[,\-&]/g, ' ') // Replace commas, dashes, ampersands with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()
      
      console.log(`   Raw name: "${rawName}"`)
      console.log(`   Clean name: "${cleanRawName}"`)
      
      // Try to find matches in REAL database
      let bestMatch = null
      let bestScore = 0
      const candidates = []
      
      for (const ingredient of allIngredients) {
        const ingredientName = ingredient.name.toLowerCase()
        
        // Exact match with cleaned name
        if (ingredientName === cleanRawName) {
          bestMatch = ingredient
          bestScore = 0.95
          console.log(`   ✅ EXACT MATCH (cleaned): "${ingredient.name}"`)
          break
        }
        
        // Check if ingredient name contains cleaned raw name
        if (ingredientName.includes(cleanRawName)) {
          const score = cleanRawName.length / ingredientName.length
          candidates.push({ ingredient, score, type: 'ingredient contains cleaned' })
          if (score > bestScore && score > 0.6) {
            bestMatch = ingredient
            bestScore = score
          }
        }
        
        // Check if cleaned raw name contains ingredient name
        if (cleanRawName.includes(ingredientName)) {
          const score = ingredientName.length / cleanRawName.length
          candidates.push({ ingredient, score, type: 'cleaned contains ingredient' })
          if (score > bestScore && score > 0.6) {
            bestMatch = ingredient
            bestScore = score
          }
        }
      }
      
      if (bestMatch && bestScore > 0.5) {
        console.log(`   🎯 BEST MATCH: "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`)
        console.log(`   📂 Category: ${bestMatch.ingredient_categories?.name || 'Unknown'}`)
      } else {
        console.log(`   ❌ NO MATCH FOUND`)
        console.log(`   🔍 Top candidates:`)
        candidates
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .forEach((c, i) => {
            console.log(`      ${i + 1}. "${c.ingredient.name}" (${c.score.toFixed(2)}) - ${c.type}`)
          })
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Real database matching test complete!')
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

// Run the test
testRealDatabaseMatching()
