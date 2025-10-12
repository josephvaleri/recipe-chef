/**
 * Mark the top 20% most frequently used ingredients per category as 'common'
 * This optimizes the Recipe Finder to show relevant ingredients by default
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function markCommonIngredients() {
  console.log('🔄 Marking common ingredients based on usage (top 20% per category, min 30)...\n');

  await markCommonIngredientsFallback();
}

async function markCommonIngredientsFallback() {
  console.log('Resetting all ingredients to common=false...');
  await supabase.from('ingredients').update({ common: false }).neq('ingredient_id', 0);
  
  const categories = [
    { id: 1, name: 'Proteins' },
    { id: 2, name: 'Vegetables' },
    { id: 3, name: 'Fruits' },
    { id: 4, name: 'Grains' },
    { id: 6, name: 'Spices & Herbs' },
    { id: 7, name: 'Dairy' }
  ];
  
  let totalMarked = 0;
  
  for (const category of categories) {
    console.log(`\nProcessing ${category.name}...`);
    
    // Get total count in this category
    const { data: allInCategory } = await supabase
      .from('ingredients')
      .select('ingredient_id')
      .eq('category_id', category.id);
    
    const totalInCategory = allInCategory?.length || 0;
    const targetCount = Math.max(30, Math.ceil(totalInCategory * 0.20));
    
    console.log(`  Total in category: ${totalInCategory}`);
    console.log(`  Target (20% or min 30): ${targetCount}`);
    
    const ingredientIds = (allInCategory || []).map(i => i.ingredient_id);
    
    if (ingredientIds.length === 0) {
      console.log(`  ⚠️  No ingredients found in this category`);
      continue;
    }
    
    // Get usage counts for this category
    const { data: usageCounts } = await supabase
      .from('global_recipe_ingredients_detail')
      .select('ingredient_id')
      .in('ingredient_id', ingredientIds);
    
    if (!usageCounts || usageCounts.length === 0) {
      console.log(`  ⚠️  No usage data found, marking first ${targetCount} alphabetically`);
      // Fallback: just mark the first N alphabetically
      const { data: fallbackIngredients } = await supabase
        .from('ingredients')
        .select('ingredient_id')
        .eq('category_id', category.id)
        .order('name')
        .limit(targetCount);
      
      if (fallbackIngredients && fallbackIngredients.length > 0) {
        await supabase
          .from('ingredients')
          .update({ common: true })
          .in('ingredient_id', fallbackIngredients.map(i => i.ingredient_id));
        
        console.log(`  ✓ Marked ${fallbackIngredients.length} ${category.name}`);
        totalMarked += fallbackIngredients.length;
      }
      continue;
    }
    
    // Count occurrences
    const counts = {};
    usageCounts.forEach(item => {
      counts[item.ingredient_id] = (counts[item.ingredient_id] || 0) + 1;
    });
    
    console.log(`  Found ${Object.keys(counts).length} ingredients with usage data`);
    
    // Get top ingredients by usage
    const topIngredients = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, targetCount)
      .map(([id]) => parseInt(id));
    
    // Mark as common
    if (topIngredients.length > 0) {
      const { error } = await supabase
        .from('ingredients')
        .update({ common: true })
        .in('ingredient_id', topIngredients);
      
      if (error) {
        console.error(`  ❌ Error marking ${category.name}:`, error);
      } else {
        console.log(`  ✓ Marked ${topIngredients.length} ${category.name} as common`);
        totalMarked += topIngredients.length;
      }
    }
  }
  
  console.log(`\n✅ Complete! Marked ${totalMarked} total ingredients as common`);
  
  // Show final summary
  const { data: summary } = await supabase
    .from('ingredients')
    .select('category_id, common');
  
  const categoryCount = {};
  summary.forEach(ing => {
    if (ing.common) {
      categoryCount[ing.category_id] = (categoryCount[ing.category_id] || 0) + 1;
    }
  });
  
  const categoryNames = {
    1: 'Proteins',
    2: 'Vegetables', 
    3: 'Fruits',
    4: 'Grains',
    5: 'Sauces and Broths',
    6: 'Spices & Herbs',
    7: 'Dairy',
    8: 'Baking',
    9: 'Oils & Fats',
    10: 'Nuts, Berries, Beans & Seeds',
    11: 'Herbs',
    12: 'Condiments',
    25: 'Wines, Vinegar, Juices'
  };
  
  console.log('\n📊 Summary by category:');
  Object.entries(categoryCount)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .forEach(([catId, count]) => {
      console.log(`   ${categoryNames[catId] || `Category ${catId}`}: ${count} ingredients`);
    });
}

markCommonIngredients();

