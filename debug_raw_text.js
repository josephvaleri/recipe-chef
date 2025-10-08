// Debug script to show exactly how the system sees the raw text

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function showRawText(text, label) {
  console.log(`\n=== ${label} ===`)
  console.log('Length:', text.length)
  console.log('Raw text with escape sequences:')
  console.log(JSON.stringify(text))
  
  console.log('\nCharacter-by-character breakdown:')
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    let description = char
    if (code === 10) description = '\\n (LF)'
    else if (code === 13) description = '\\r (CR)'
    else if (code === 9) description = '\\t (TAB)'
    else if (code === 32) description = '\\s (SPACE)'
    else if (code < 32) description = `\\x${code.toString(16).padStart(2, '0')} (control)`
    
    console.log(`[${i.toString().padStart(2, '0')}] '${char}' (${code}) - ${description}`)
  }
  
  console.log('\nSplit by \\n:')
  const linesByN = text.split('\n')
  console.log('Lines count:', linesByN.length)
  linesByN.forEach((line, i) => {
    console.log(`  [${i}] "${line}" (length: ${line.length})`)
  })
  
  console.log('\nSplit by \\r\\n:')
  const linesByRN = text.split('\r\n')
  console.log('Lines count:', linesByRN.length)
  linesByRN.forEach((line, i) => {
    console.log(`  [${i}] "${line}" (length: ${line.length})`)
  })
  
  console.log('\nSplit by /\\r?\\n/:')
  const linesByRegex = text.split(/\r?\n/)
  console.log('Lines count:', linesByRegex.length)
  linesByRegex.forEach((line, i) => {
    console.log(`  [${i}] "${line}" (length: ${line.length})`)
  })
}

async function debugRawText() {
  try {
    console.log('Fetching global recipe 652...')
    
    // Get the recipe with ingredients
    const { data: recipe, error: recipeError } = await supabase
      .from('global_recipes')
      .select(`
        recipe_id,
        title,
        ingredients:global_recipe_ingredients(
          raw_name
        )
      `)
      .eq('recipe_id', 652)
      .single()

    if (recipeError) {
      console.error('Error fetching recipe:', recipeError)
      return
    }

    console.log('Recipe:', recipe.title)
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const rawName = recipe.ingredients[0].raw_name
      showRawText(rawName, 'Raw ingredient text from database')
    } else {
      console.log('No ingredients found')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

debugRawText()
