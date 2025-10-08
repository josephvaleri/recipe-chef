// Test potatoes and spinach
async function test() {
  console.log('🔍 Testing potatoes and spinach...\n')
  
  const testIngredients = [
    "2 cups shredded potatoes (store bought is fine)",
    "1 cup small chunk Potatoes for hash browns (store bought ok)",
    "1 cup spinach leaves; ripped small"
  ]
  
  const response = await fetch('http://localhost:3000/api/ingredients/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients: testIngredients })
  })
  
  const result = await response.json()
  
  console.log(`Matched: ${result.total_matched}/${testIngredients.length}`)
  console.log(`Unmatched: ${result.total_unmatched}/${testIngredients.length}\n`)
  
  if (result.matched && Object.keys(result.matched).length > 0) {
    console.log('✅ MATCHED:')
    Object.entries(result.matched).forEach(([category, items]) => {
      items.forEach(item => {
        console.log(`  - ${item.name} from "${item.original_text}"`)
      })
    })
  }
  
  if (result.unmatched && result.unmatched.length > 0) {
    console.log('\n❌ NOT FOUND:')
    result.unmatched.forEach(item => {
      console.log(`  - "${item}"`)
    })
  }
  
  if (result.total_matched === 3) {
    console.log('\n🎉 SUCCESS! All found!')
  } else {
    console.log('\n⚠️  Check server console for parsing details')
  }
}

test().catch(console.error)
