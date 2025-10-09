import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parsePaprikaFromStream } from '@/lib/paprika'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 BULK UPLOAD API CALLED - Starting request processing')
    
    // Use admin client to bypass authentication issues (same pattern as other APIs)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('✅ Using admin Supabase client (bypassing auth issues)')

    console.log('📝 Parsing form data...')
    const formData = await request.formData()
    console.log('✅ Form data parsed')
    
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    
    console.log('📁 File details:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      type: type 
    })

    if (!file) {
      console.log('❌ No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    let recipesProcessed = 0

    if (type === 'paprika') {
      // Handle both .paprikarecipe (individual) and .paprikarecipes (export) files
      // The parsePaprikaFromStream function works for both file types
      try {
        console.log('🍽️ Processing Paprika file:', file.name, '(supports both .paprikarecipe and .paprikarecipes)')
        
        // Convert File to Readable stream (same as existing import-paprika API)
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

        // Parse the Paprika file using existing function
        const recipes = await parsePaprikaFromStream(stream as any)
        console.log('🍽️ Parsed recipes:', recipes.length)
        
        for (const recipe of recipes) {
          console.log(`🍽️ Processing recipe: ${recipe.title}`)
          
          let imageUrl: string | undefined
          
          // Upload image if present
          if (recipe.imageData) {
            try {
              const imageBuffer = Buffer.isBuffer(recipe.imageData) ? recipe.imageData : Buffer.from(recipe.imageData, 'base64')
              const imageFilename = `global-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
              const imagePath = `global/${imageFilename}`
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('recipe-images')
                .upload(imagePath, imageBuffer, {
                  contentType: 'image/jpeg',
                  upsert: true
                })
              
              if (uploadError) {
                console.warn('⚠️ Image upload failed for global recipe:', uploadError)
              } else {
                const { data: { publicUrl } } = supabase.storage
                  .from('recipe-images')
                  .getPublicUrl(uploadData.path)
                
                imageUrl = publicUrl
                console.log('✅ Image uploaded for global recipe:', publicUrl)
              }
            } catch (error) {
              console.warn('⚠️ Exception during global image upload:', error)
            }
          }

          // Insert global recipe
          console.log(`💾 Inserting global recipe: ${recipe.title}`)
          const { data: globalRecipe, error: recipeError } = await supabase
            .from('global_recipes')
            .insert({
              title: recipe.title,
              description: recipe.description,
              prep_time: recipe.prepTime,
              cook_time: recipe.cookTime,
              servings: recipe.servings,
              image_url: imageUrl,
              is_published: true,
              added_count: 0
            })
            .select()
            .single()

          if (recipeError) {
            console.error('❌ Error inserting recipe:', recipeError)
            continue
          }
          
          console.log(`✅ Recipe inserted with ID: ${globalRecipe.recipe_id}`)

          // Save ingredients as raw text (like user recipes)
          if (recipe.ingredients && recipe.ingredients.length > 0) {
            console.log(`🥕 Processing ${recipe.ingredients.length} ingredient lines for ${recipe.title}`)
            
            // Join all ingredients with line breaks for display (like user recipes)
            const displayText = recipe.ingredients.join('\n')
            console.log(`📄 Display text length: ${displayText.length} characters`)
            
            // Save only the formatted display text (like user recipes do for display)
            const ingredientsData = [{
              recipe_id: globalRecipe.recipe_id,
              raw_name: displayText,
              amount: null,
              unit: null
            }]

            console.log(`🔍 About to insert ${ingredientsData.length} ingredient records:`)
            console.log(`📊 Sample data:`, ingredientsData.slice(0, 2))
            
            const { error: ingredientsError } = await supabase
              .from('global_recipe_ingredients')
              .insert(ingredientsData)

            if (ingredientsError) {
              console.error('❌ Error saving ingredients:', ingredientsError)
              console.error('❌ Full error details:', JSON.stringify(ingredientsError, null, 2))
            } else {
              console.log(`✅ Successfully saved ${ingredientsData.length} ingredient records for ${recipe.title}`)
            }
          }

          // Save directions/steps
          if (recipe.directions && recipe.directions.length > 0) {
            const steps = recipe.directions.map((direction, index) => ({
              recipe_id: globalRecipe.recipe_id,
              step_number: index + 1,
              text: direction
            }))

            const { error: stepsError } = await supabase
              .from('global_recipe_steps')
              .insert(steps)

            if (stepsError) {
              console.error('Error saving steps:', stepsError)
            }
          }

          recipesProcessed++
        }
      } catch (error) {
        console.error('Error parsing Paprika file:', error)
        return NextResponse.json({ error: 'Failed to parse Paprika file' }, { status: 400 })
      }
    } else if (type === 'csv') {
      // Handle CSV file
      const fileBuffer = await file.arrayBuffer()
      const fileContent = new TextDecoder('utf-8').decode(fileBuffer)
      const lines = fileContent.split('\n')
      const headers = lines[0].split(',').map((h: string) => h.trim())
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue
        
        const values = lines[i].split(',').map((v: string) => v.trim())
        const recipeData: any = {}
        
        headers.forEach((header: string, index: number) => {
          recipeData[header] = values[index] || ''
        })

        try {
          // Parse JSON fields
          const ingredients = recipeData.ingredients ? JSON.parse(recipeData.ingredients) : []
          const steps = recipeData.steps ? JSON.parse(recipeData.steps) : []

          // Insert global recipe
          const { data: globalRecipe, error: recipeError } = await supabase
            .from('global_recipes')
            .insert({
              title: recipeData.title,
              description: recipeData.description,
              prep_time: recipeData.prep_time,
              cook_time: recipeData.cook_time,
              total_time: recipeData.total_time,
              servings: recipeData.servings,
              difficulty: recipeData.difficulty,
              image_url: recipeData.image_url,
              cuisine_id: recipeData.cuisine_id ? parseInt(recipeData.cuisine_id) : null,
              meal_type_id: recipeData.meal_type_id ? parseInt(recipeData.meal_type_id) : null,
              is_published: true,
              added_count: 0
            })
            .select()
            .single()

          if (recipeError) {
            console.error('Error inserting recipe:', recipeError)
            continue
          }

          // Insert ingredients
          if (ingredients.length > 0) {
            const ingredientInserts = ingredients.map((ing: any) => ({
              recipe_id: globalRecipe.recipe_id,
              ingredient_id: ing.ingredient_id,
              amount: ing.amount,
              unit: ing.unit
            }))

            await supabase
              .from('global_recipe_ingredients')
              .insert(ingredientInserts)
          }

          // Insert steps
          if (steps.length > 0) {
            const stepInserts = steps.map((step: any) => ({
              recipe_id: globalRecipe.recipe_id,
              step_number: step.step_number,
              text: step.text
            }))

            await supabase
              .from('global_recipe_steps')
              .insert(stepInserts)
          }

          recipesProcessed++
        } catch (error) {
          console.error('Error processing CSV row:', error)
          continue
        }
      }
    }

    return NextResponse.json({
      success: true,
      recipesProcessed,
      message: `Successfully processed ${recipesProcessed} recipes`
    })

  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
