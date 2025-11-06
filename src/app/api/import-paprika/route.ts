import { NextRequest, NextResponse } from 'next/server';
import { parsePaprikaFromStream } from '@/lib/paprika';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { NormalizedRecipe } from '@/lib/paprika/types';
import { parseIngredients as parseIngredientTexts } from '@/lib/parseIngredient';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper function to parse complex ingredient lines into individual ingredients
function parseIngredients(ingredients: string[]): { displayText: string; individualIngredients: Array<{ name: string; amount: string; unit: string }> } {
  // Join ingredients with line breaks for display
  const displayText = ingredients.join('\n');
  
  // Use the shared ingredient parser for consistent parsing
  const parsedIngredients = parseIngredientTexts(ingredients);
  
  const individualIngredients = parsedIngredients.map(parsed => ({
    name: parsed.name || parsed.original,
    amount: parsed.amount,
    unit: parsed.unit
  }));
  
  return { displayText, individualIngredients };
}

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

async function uploadImageToStorage(imageData: Buffer, filename: string, userId: string): Promise<string | null> {
  try {
    console.log(`   🔍 Attempting to upload image to: recipe-images/${userId}/${filename}`);
    console.log(`   📊 Image data size: ${imageData.length} bytes`);
    console.log(`   👤 User ID in upload function: "${userId}"`);
    console.log(`   📁 Filename: "${filename}"`);
    console.log(`   🛤️ Full path: ${userId}/${filename}`);
    
    // Try to upload directly - if bucket doesn't exist, it will fail gracefully
    const { data, error } = await supabaseAdmin.storage
      .from('recipe-images')
      .upload(`${userId}/${filename}`, imageData, {
        contentType: 'image/jpeg',
        upsert: true // Allow overwriting existing files
      });

    if (error) {
      console.warn('❌ Image upload failed with error:', {
        message: error.message,
        path: `${userId}/${filename}`
      });
      return null;
    }

    console.log(`   ✅ Image uploaded successfully to: ${data.path}`);
    
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('recipe-images')
      .getPublicUrl(data.path);

    console.log(`   🔗 Public URL generated: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.warn('❌ Exception during image upload:', error);
    return null;
  }
}

async function checkForDuplicateRecipe(title: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_recipes')
      .select('user_recipe_id')
      .eq('user_id', userId)
      .eq('title', title)
      .limit(1);

    if (error) {
      console.warn('   ⚠️ Error checking for duplicate recipe:', error);
      return false; // If we can't check, allow the save
    }

    return data && data.length > 0;
  } catch (error) {
    console.warn('   ⚠️ Exception checking for duplicate recipe:', error);
    return false; // If we can't check, allow the save
  }
}

async function saveRecipeToDatabase(recipe: NormalizedRecipe, userId: string): Promise<{ success: boolean; recipeId?: string; error?: string }> {
  try {
    console.log(`   💾 Saving recipe to database: "${recipe.title}"`);
    
    // Check for duplicate recipe
    const isDuplicate = await checkForDuplicateRecipe(recipe.title, userId);
    if (isDuplicate) {
      console.log(`   ⚠️ Skipping duplicate recipe: "${recipe.title}"`);
      return { success: false, error: 'Recipe with this name already exists' };
    }
    
    // Upload image if present
    let imageUrl: string | undefined;
    if (recipe.imageData && recipe.imageFilename) {
      console.log(`   🖼️ Uploading image: ${recipe.imageFilename}`);
      imageUrl = await uploadImageToStorage(recipe.imageData, recipe.imageFilename, userId) || undefined;
      if (imageUrl) {
        console.log(`   ✅ Image uploaded: ${imageUrl}`);
      } else {
        console.log(`   ⚠️ Image upload failed, continuing without image`);
      }
    }

    // Insert recipe
    console.log(`   📝 Inserting recipe into database...`);
    const { data: savedRecipe, error: recipeError } = await supabaseAdmin
      .from('user_recipes')
      .insert({
        user_id: userId,
        title: recipe.title,
        description: recipe.description,  // Now includes notes!
        image_url: imageUrl,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,     // Now includes difficulty!
        source_name: recipe.sourceName,
        source_url: recipe.sourceUrl,
        diet: recipe.diet
      })
      .select()
      .single();

    if (recipeError || !savedRecipe) {
      console.log(`   ❌ Recipe insert failed:`, recipeError);
      return { success: false, error: recipeError?.message || 'Failed to save recipe' };
    }
    
    console.log(`   ✅ Recipe saved with ID: ${savedRecipe.user_recipe_id}`);

            // Save ingredients - both as formatted display text and individual parsed ingredients
            if (recipe.ingredients.length > 0) {
              console.log(`   🥕 Parsing ${recipe.ingredients.length} ingredient lines...`);
              
              const { displayText, individualIngredients } = parseIngredients(recipe.ingredients);
              
              console.log(`   📝 Found ${individualIngredients.length} individual ingredients`);
              console.log(`   📄 Display text length: ${displayText.length} characters`);
              
              // Save the formatted display text as the first ingredient entry
              const ingredientsData = [{
                user_recipe_id: savedRecipe.user_recipe_id,
                raw_name: displayText,
                amount: '',
                unit: ''
              }];
              
              // Add individual parsed ingredients
              individualIngredients.forEach(ingredient => {
                ingredientsData.push({
                  user_recipe_id: savedRecipe.user_recipe_id,
                  raw_name: ingredient.name,
                  amount: ingredient.amount,
                  unit: ingredient.unit
                });
              });

              const { error: ingredientsError } = await supabaseAdmin
                .from('user_recipe_ingredients')
                .insert(ingredientsData);

              if (ingredientsError) {
                console.error('   ❌ Failed to save ingredients:', ingredientsError);
              } else {
                console.log(`   ✅ Saved formatted display text + ${individualIngredients.length} individual ingredients`);
              }
            }

    // Save directions
    if (recipe.directions.length > 0) {
      console.log(`   📋 Saving ${recipe.directions.length} directions...`);
      const directionsData = recipe.directions.map((direction, index) => ({
        user_recipe_id: savedRecipe.user_recipe_id,
        text: direction,
        step_number: index + 1
      }));

      const { error: directionsError } = await supabaseAdmin
        .from('user_recipe_steps')
        .insert(directionsData);

      if (directionsError) {
        console.error('   ❌ Failed to save directions:', directionsError);
      } else {
        console.log(`   ✅ Directions saved successfully`);
      }
    }

    return { success: true, recipeId: savedRecipe.user_recipe_id };
  } catch (error) {
    console.error('Error saving recipe:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 Starting Paprika import API request');
  
  // Debug Supabase admin client
  console.log('🔧 Supabase admin client check:', {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    clientCreated: !!supabaseAdmin
  });
  
  try {
    // Add overall timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 300000) // 5 minute timeout
    );

    const processRequest = async () => {
      console.log('📝 Parsing form data...');
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const userId = formData.get('userId') as string;
      
      console.log('📁 File details:', {
        name: file?.name,
        size: file?.size,
        type: file?.type
      });
      console.log('👤 User ID from form data:', userId);
      console.log('👤 User ID type:', typeof userId);
      console.log('👤 User ID length:', userId?.length);

    if (!file) {
      console.log('❌ No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      console.log('❌ No user ID provided');
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.log('❌ Invalid user ID format:', userId);
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }
    
    console.log('✅ User ID validation passed');

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.log('❌ File too large:', file.size, 'bytes');
      return NextResponse.json({ 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }
    console.log('✅ File size check passed:', file.size, 'bytes');

    // Check file type
    const allowedTypes = ['.paprikarecipe', '.paprikarecipes'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
      console.log('❌ Invalid file type:', fileName);
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload .paprikarecipe or .paprikarecipes files' 
      }, { status: 400 });
    }
    console.log('✅ File type check passed:', fileName);

    // Convert File to Readable stream
    console.log('🔄 Converting file to stream...');
    const stream = new ReadableStream({
      start(controller) {
        const reader = file.stream().getReader();
        
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            return pump();
          });
        }
        
        return pump();
      }
    });

    // Parse the Paprika file
    console.log('📖 Parsing Paprika file...');
    const recipes = await parsePaprikaFromStream(stream as any);
    console.log('📊 Found recipes:', recipes.length);

    if (recipes.length === 0) {
      return NextResponse.json({ 
        error: 'No valid recipes found in the file' 
      }, { status: 400 });
    }

            // Save recipes to database with timeout protection
            const results = [];
            let successCount = 0;
            let errorCount = 0;
            let duplicateCount = 0;

    console.log(`🔄 Processing ${recipes.length} recipes...`);
    console.log('📋 Recipe titles preview:', recipes.slice(0, 5).map(r => r.title));

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      console.log(`\n📝 Processing recipe ${i + 1}/${recipes.length}: "${recipe.title}"`);
      console.log(`   - Ingredients: ${recipe.ingredients.length}`);
      console.log(`   - Directions: ${recipe.directions.length}`);
      console.log(`   - Has image: ${!!recipe.imageData}`);
      
      try {
        // Add timeout protection for each recipe
        const result = await Promise.race([
          saveRecipeToDatabase(recipe, userId),
          new Promise<{ success: boolean; error?: string }>((_, reject) => 
            setTimeout(() => reject(new Error('Recipe processing timeout')), 30000) // 30 second timeout
          )
        ]);

                results.push({
                  title: recipe.title,
                  success: result.success,
                  error: result.error,
                  skipped: result.error === 'Recipe with this name already exists'
                });

                if (result.success) {
                  successCount++;
                  console.log(`✅ Successfully processed: ${recipe.title}`);
                } else if (result.error === 'Recipe with this name already exists') {
                  duplicateCount++;
                  console.log(`⚠️ Skipped duplicate: ${recipe.title}`);
                } else {
                  errorCount++;
                  console.log(`❌ Failed to process: ${recipe.title} - ${result.error}`);
                }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Error processing ${recipe.title}: ${errorMessage}`);
        results.push({
          title: recipe.title,
          success: false,
          error: errorMessage
        });
      }
      
              // Progress update every 10 recipes
              if ((i + 1) % 10 === 0) {
                console.log(`📊 Progress: ${i + 1}/${recipes.length} (${successCount} success, ${errorCount} failed, ${duplicateCount} skipped)`);
              }
    }

    console.log(`\n🎉 Import completed!`);
    console.log(`📊 Final results: ${successCount} successful, ${errorCount} failed out of ${recipes.length} total`);
    
              return NextResponse.json({
                imported: successCount,
                total: recipes.length,
                errors: errorCount,
                duplicates: duplicateCount,
                names: recipes.map(r => r.title),
                results: results
              });
    };

    // Race between processing and timeout
    const result = await Promise.race([processRequest(), timeoutPromise]);
    return result as NextResponse;

  } catch (error) {
    console.error('Paprika import error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process Paprika file' 
    }, { status: 500 });
  }
}
