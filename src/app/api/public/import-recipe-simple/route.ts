import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // For now, just return a mock recipe to test the endpoint
    const mockRecipe = {
      name: 'Test Recipe',
      description: 'A test recipe for GPT import',
      recipeIngredient: [
        '2 cups flour',
        '1 cup sugar',
        '1/2 cup butter'
      ],
      recipeInstructions: [
        'Mix dry ingredients',
        'Add butter',
        'Bake at 350°F for 20 minutes'
      ],
      prepTime: '10 minutes',
      cookTime: '20 minutes',
      totalTime: '30 minutes',
      recipeYield: '12 servings',
      source: 'Test Source',
      sourceUrl: url
    }

    const paprikaText = `# ${mockRecipe.name}

${mockRecipe.description}

## Timing
Prep: ${mockRecipe.prepTime}
Cook: ${mockRecipe.cookTime}
Total: ${mockRecipe.totalTime}

Servings: ${mockRecipe.recipeYield}

## Ingredients
${mockRecipe.recipeIngredient.map(ing => `- ${ing}`).join('\n')}

## Instructions
${mockRecipe.recipeInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

---
Source: ${mockRecipe.sourceUrl}`

    return NextResponse.json({
      recipe: mockRecipe,
      paprikaText,
      confidence: 'high',
      source: 'mock',
      title: 'Test Recipe',
      saved: false,
      message: 'Mock recipe generated successfully!'
    })

  } catch (error) {
    console.error('Simple import recipe error:', error)
    return NextResponse.json(
      { error: 'Failed to import recipe' }, 
      { status: 500 }
    )
  }
}
