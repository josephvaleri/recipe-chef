import type { PaprikaRaw, NormalizedRecipe } from './types';

/**
 * Strips HTML tags and converts to array of lines
 */
function stripHtmlToLines(html: string): string[] {
  if (!html || typeof html !== 'string') return [];
  
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .split(/[\n\r]+/) // Split by newlines
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Converts array or string to string array
 */
function toArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

/**
 * Extracts base64 image data and returns Buffer + filename
 */
function extractImageData(photoData: string): { imageData: Buffer; imageFilename: string } | null {
  if (!photoData || typeof photoData !== 'string') {
    console.log('   🖼️ No photo_data or invalid type');
    return null;
  }
  
  console.log(`   🖼️ Processing image data, length: ${photoData.length}`);
  
  // Remove data URL prefix if present
  const base64Data = photoData.replace(/^data:image\/[^;]+;base64,/, '');
  
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `recipe-image-${Date.now()}.jpg`;
    console.log(`   🖼️ Image buffer created, size: ${buffer.length} bytes`);
    return { imageData: buffer, imageFilename: filename };
  } catch (error) {
    console.log('   🖼️ Failed to process image data:', error);
    return null;
  }
}

/**
 * Normalizes a Paprika recipe JSON to our standard format
 */
export function normalizePaprika(json: PaprikaRaw): NormalizedRecipe {
  // Extract image data if present
  let imageData: Buffer | undefined;
  let imageFilename: string | undefined;
  
  if (json.photo_data) {
    const imageResult = extractImageData(json.photo_data);
    if (imageResult) {
      imageData = imageResult.imageData;
      imageFilename = imageResult.imageFilename;
    }
  }

  // Handle ingredients - try multiple possible field names
  let ingredients: string[] = [];
  if (json.ingredients) {
    ingredients = toArray(json.ingredients);
  } else if (json.ingredient_lines) {
    ingredients = toArray(json.ingredient_lines);
  } else if (json.ingredients_html) {
    ingredients = stripHtmlToLines(json.ingredients_html);
  }

  // Handle directions/instructions - try multiple possible field names
  let directions: string[] = [];
  if (json.directions) {
    directions = toArray(json.directions);
  } else if (json.instructions) {
    directions = toArray(json.instructions);
  } else if (json.directions_html) {
    directions = stripHtmlToLines(json.directions_html);
  } else if (json.instructions_html) {
    directions = stripHtmlToLines(json.instructions_html);
  }

  // Handle tags
  let tags: string[] = [];
  if (json.tags) {
    tags = toArray(json.tags);
  } else if (json.categories) {
    tags = toArray(json.categories);
  }

  return {
    title: json.name || json.title || 'Untitled Recipe',
    description: json.description || json.notes || '',
    imageData,
    imageFilename,
    cuisine: json.cuisine || json.course || '',
    mealType: json.category || json.course || '',
    servings: json.servings || json.yield || '',
    prepTime: json.prep_time || json.prepTime || '',
    cookTime: json.cook_time || json.cookTime || '',
    totalTime: json.total_time || json.totalTime || '',
    diet: json.diet || '',
    sourceName: json.source || json.source_name || '',
    sourceUrl: json.source_url || json.url || '',
    ingredients,
    directions,
    tags
  };
}
