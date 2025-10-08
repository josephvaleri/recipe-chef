// Test the ingredient parser on the specific items from recipe 658
// Run this in your browser console on the recipe chef site

function parseIngredient(rawIngredient) {
  const rawName = rawIngredient.toLowerCase().trim()
  
  // Clean the raw name - remove common descriptors
  const cleanRawName = rawName
    .replace(/\b\d+\b/g, '') // Remove numbers
    .replace(/\b(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|diced|chopped|peeled|minced|sliced|grated|shredded|crushed|whole|large|medium|small|fresh|dried|frozen|canned|organic|raw|cooked|roasted|grilled|fried|boiled|steamed)\b/g, '')
    .replace(/[,\-&]/g, ' ') // Replace commas, dashes, ampersands with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
  
  return {
    original: rawIngredient,
    rawName: rawName,
    cleanRawName: cleanRawName,
    removedWords: rawName.split(' ').filter(word => 
      !cleanRawName.includes(word.toLowerCase())
    )
  }
}

// Test the specific ingredients from recipe 658
const testIngredients = [
  '1 Carrot, Diced',
  '1 Onion, Peeled & Diced', 
  '1 Stalk Celery, Diced',
  '4 Tablespoons Chopped Pancetta',
  '3 Cloves Garlic, Peeled & Minced'
]

console.log('🧪 Testing ingredient parser on recipe 658 items:')
console.log('=' .repeat(60))

testIngredients.forEach((ingredient, index) => {
  const result = parseIngredient(ingredient)
  console.log(`\n${index + 1}. "${ingredient}"`)
  console.log(`   Raw name: "${result.rawName}"`)
  console.log(`   Clean name: "${result.cleanRawName}"`)
  console.log(`   Removed words: [${result.removedWords.map(w => `"${w}"`).join(', ')}]`)
  console.log(`   Length change: ${result.rawName.length} → ${result.cleanRawName.length} chars`)
})

console.log('\n' + '=' .repeat(60))
console.log('✅ Parser test complete!')
