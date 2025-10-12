export type PaprikaRaw = Record<string, any>;

export type NormalizedRecipe = {
  title: string;
  description?: string;
  imageData?: Buffer;         // parsed from embedded base64 if present
  imageFilename?: string;     // suggested filename
  cuisine?: string;
  mealType?: string;          // aka course/category in some exports
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  difficulty?: string;        // Easy, Medium, Hard, Very Hard
  diet?: string;
  sourceName?: string;
  sourceUrl?: string;
  ingredients: string[];      // one line per ingredient
  directions: string[];       // ordered steps
  tags?: string[];
};

