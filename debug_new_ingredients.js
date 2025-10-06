// Debug script to test the parseIngredientText function with new missing ingredients
function parseIngredientText(text) {
  console.log('Parsing ingredient text:', text)
  
  // Remove measurements, quantities, and descriptive words to find the main ingredient noun
  let cleanedText = text
    .replace(/\b\d+\/\d+|\d+-\d+|\d+\s*(cup|tbsp|tsp|oz|lb|kg|g|ml|l|pound|ounce|gram|liter|milliliter|tablespoon|teaspoon|cloves|clove|pieces|piece|pounds|pound|ounces|ounce)\b/gi, '')
    .replace(/\b\d+\b/g, '')  // Remove standalone numbers
    .replace(/\b(for|to|taste|serving|garnish|optional|as needed|cut|crosswise|into|julienned|sliced|crushed|chopped|fresh|grated|plus|more|red|white|black|green|yellow|large|medium|small|whole|half|quarter|extra|virgin|extra-virgin|dried|fresh|frozen|canned|raw|cooked|other|wide|spaghetti|and|smashed|finely|peeled|grated|inch|piece|pieces|one|two|three|four|five|six|seven|eight|nine|ten|zest|juice|removed|strips|peeler|with|of|in|link|links|bite|size|chunks|chunk|pull|meat|out|skin|mild|cup|cups)\b/gi, '')
    .replace(/[,\-&()]/g, ' ')  // Also remove parentheses
    .replace(/\s+/g, ' ')
    .trim()

  console.log('Cleaned text:', cleanedText)
  
  // Special handling for ingredients with parentheses - extract the main ingredient before the parentheses
  if (text.includes('(')) {
    console.log('Found parentheses in text, extracting main ingredient before parentheses')
    const beforeParentheses = text.split('(')[0].trim()
    const mainIngredient = beforeParentheses
      .replace(/\b\d+\/\d+|\d+-\d+|\d+\s*(cup|tbsp|tsp|oz|lb|kg|g|ml|l|pound|ounce|gram|liter|milliliter|tablespoon|teaspoon|cloves|clove|pieces|piece|pounds|pound|ounces|ounce)\b/gi, '')
      .replace(/\b\d+\b/g, '')  // Remove standalone numbers
      .replace(/\b(for|to|taste|serving|garnish|optional|as needed|cut|crosswise|into|julienned|sliced|crushed|chopped|fresh|grated|plus|more|red|white|black|green|yellow|large|medium|small|whole|half|quarter|extra|virgin|extra-virgin|dried|fresh|frozen|canned|raw|cooked|other|wide|spaghetti|and|smashed|finely|peeled|grated|inch|piece|pieces|one|two|three|four|five|six|seven|eight|nine|ten|zest|juice|removed|strips|peeler|with|of|in|link|links|bite|size|chunks|chunk|pull|meat|out|skin|mild|cup|cups)\b/gi, '')
      .replace(/[,\-&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (mainIngredient) {
      console.log('Main ingredient from parentheses parsing:', mainIngredient)
      return [mainIngredient].filter(term => term.trim().length > 0)
    }
  }
  
  // Special handling for ingredients with "or" - try both options
  if (cleanedText.includes(' or ')) {
    console.log('Found "or" in text, will try both options')
    const parts = cleanedText.split(' or ')
    const allOptions = []
    for (const part of parts) {
      const words = part.trim().split(' ').filter(word => word.length > 2)
      if (words.length >= 1) {
        allOptions.push(words[words.length - 1]) // last word of each part
      }
    }
    console.log('Options from "or" parsing:', allOptions)
    return allOptions.filter(term => term.trim().length > 0)
  }

  // Split into words and find the main ingredient noun (usually the last meaningful word)
  const words = cleanedText.split(' ').filter(word => 
    word.length > 2 && 
    !/^\d+$/.test(word) && // not just numbers
    !/^(and|or|the|a|an|of|in|on|at|to|for|with|by|or|other|wide|noodle|or|bacon|pancetta)$/i.test(word) // common words
  )

  console.log('Filtered words:', words)

  // The main ingredient is usually the last word or the last two words
  const potentialIngredients = []
  
  if (words.length >= 2) {
    // Try the last two words (e.g., "olive oil", "pecorino romano")
    const lastTwoWords = words.slice(-2).join(' ')
    potentialIngredients.push(lastTwoWords)
  }
  
  if (words.length >= 1) {
    // Try the last word (e.g., "garlic", "onion")
    const lastWord = words[words.length - 1]
    potentialIngredients.push(lastWord)
  }
  
  console.log('Potential ingredients:', potentialIngredients)
  
  const filteredIngredients = potentialIngredients.filter(term => term.trim().length > 0)
  console.log('Filtered potential ingredients:', filteredIngredients)
  
  return filteredIngredients
}

// Test the problematic lines
const testCases = [
  "4 tomatoes (canned)",
  "1/2 tsp Sazon Goya",
  "2 Cups Chicken Broth",
  "1/4 cup Cilantro, fresh, chopped"
]

testCases.forEach((testCase, index) => {
  console.log(`\n=== Test Case ${index + 1}: "${testCase}" ===`)
  const result = parseIngredientText(testCase)
  console.log('Final result:', result)
})
