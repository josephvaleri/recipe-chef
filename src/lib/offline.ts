// Offline storage utilities for PWA

interface OfflineRecipe {
  user_recipe_id: number
  title: string
  description?: string
  image_url?: string
  prep_time?: string
  cook_time?: string
  total_time?: string
  servings?: string
  difficulty?: string
  source_name?: string
  source_url?: string
  is_favorite: boolean
  created_at: string
  cuisine?: { name: string }
  meal_type?: { name: string }
  ingredients: Array<{
    amount?: string
    unit?: string
    raw_name?: string
    ingredient?: { name: string }
  }>
  steps: Array<{
    step_number: number
    text: string
  }>
  equipment: Array<{
    equipment: { name: string }
  }>
  tags: Array<{
    tag: { name: string }
  }>
  rating?: number
}

const DB_NAME = 'RecipeChefDB'
const DB_VERSION = 1
const RECIPES_STORE = 'recipes'
const OFFLINE_QUEUE_STORE = 'offlineQueue'

export class OfflineStorage {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create recipes store
        if (!db.objectStoreNames.contains(RECIPES_STORE)) {
          const recipesStore = db.createObjectStore(RECIPES_STORE, { keyPath: 'user_recipe_id' })
          recipesStore.createIndex('title', 'title', { unique: false })
          recipesStore.createIndex('created_at', 'created_at', { unique: false })
        }

        // Create offline queue store
        if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
          db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
        }
      }
    })
  }

  async saveRecipe(recipe: OfflineRecipe): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RECIPES_STORE], 'readwrite')
      const store = transaction.objectStore(RECIPES_STORE)
      const request = store.put(recipe)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getRecipe(recipeId: number): Promise<OfflineRecipe | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RECIPES_STORE], 'readonly')
      const store = transaction.objectStore(RECIPES_STORE)
      const request = store.get(recipeId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllRecipes(): Promise<OfflineRecipe[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RECIPES_STORE], 'readonly')
      const store = transaction.objectStore(RECIPES_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async searchRecipes(query: string): Promise<OfflineRecipe[]> {
    if (!this.db) await this.init()

    const allRecipes = await this.getAllRecipes()
    const lowerQuery = query.toLowerCase()

    return allRecipes.filter(recipe => 
      recipe.title.toLowerCase().includes(lowerQuery) ||
      recipe.description?.toLowerCase().includes(lowerQuery) ||
      recipe.cuisine?.name.toLowerCase().includes(lowerQuery)
    )
  }

  async deleteRecipe(recipeId: number): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RECIPES_STORE], 'readwrite')
      const store = transaction.objectStore(RECIPES_STORE)
      const request = store.delete(recipeId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async queueOfflineAction(action: {
    type: 'create' | 'update' | 'delete'
    data: any
    timestamp: number
  }): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OFFLINE_QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE)
      const request = store.add(action)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getOfflineQueue(): Promise<any[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OFFLINE_QUEUE_STORE], 'readonly')
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async clearOfflineQueue(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OFFLINE_QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export const offlineStorage = new OfflineStorage()

// Network status utilities
export class NetworkManager {
  private isOnline: boolean = navigator.onLine
  private listeners: ((online: boolean) => void)[] = []

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners()
    })
  }

  get online(): boolean {
    return this.isOnline
  }

  addListener(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline))
  }
}

export const networkManager = new NetworkManager()

// Cache management
export class CacheManager {
  async cacheRecipeImages(recipes: OfflineRecipe[]): Promise<void> {
    if (!('caches' in window)) return

    const cache = await caches.open('recipe-images')
    const imageUrls = recipes
      .map(recipe => recipe.image_url)
      .filter(Boolean) as string[]

    await Promise.all(
      imageUrls.map(async (url) => {
        try {
          const response = await fetch(url)
          if (response.ok) {
            await cache.put(url, response)
          }
        } catch (error) {
          console.warn('Failed to cache image:', url, error)
        }
      })
    )
  }

  async getCachedImage(url: string): Promise<Response | null> {
    if (!('caches' in window)) return null

    const cache = await caches.open('recipe-images')
    return await cache.match(url)
  }

  async clearCache(): Promise<void> {
    if (!('caches' in window)) return

    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    )
  }
}

export const cacheManager = new CacheManager()

// Sync manager for handling online/offline synchronization
export class SyncManager {
  private isOnline: boolean = navigator.onLine
  private syncInProgress: boolean = false

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.syncOfflineQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  async syncOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return

    this.syncInProgress = true

    try {
      const queue = await offlineStorage.getOfflineQueue()
      
      for (const action of queue) {
        try {
          await this.processOfflineAction(action)
        } catch (error) {
          console.error('Failed to sync action:', action, error)
          // Continue with other actions
        }
      }

      // Clear the queue after successful sync
      await offlineStorage.clearOfflineQueue()
      
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  private async processOfflineAction(action: any): Promise<void> {
    const { supabase } = await import('./supabase')
    
    switch (action.type) {
      case 'create':
        // Handle recipe creation
        await this.syncCreateRecipe(action.data)
        break
      case 'update':
        // Handle recipe update
        await this.syncUpdateRecipe(action.data)
        break
      case 'delete':
        // Handle recipe deletion
        await this.syncDeleteRecipe(action.data)
        break
    }
  }

  private async syncCreateRecipe(recipeData: any): Promise<void> {
    const { supabase } = await import('./supabase')
    const { getCurrentUser } = await import('./auth')
    
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    // Create recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .insert({
        user_id: user.id,
        title: recipeData.title,
        description: recipeData.description,
        image_url: recipeData.image_url,
        prep_time: recipeData.prep_time,
        cook_time: recipeData.cook_time,
        servings: recipeData.servings,
        difficulty: recipeData.difficulty,
        source_name: recipeData.source_name,
        source_url: recipeData.source_url
      })
      .select()
      .single()

    if (recipeError) throw recipeError

    // Create ingredients
    if (recipeData.ingredients?.length > 0) {
      const ingredients = recipeData.ingredients.map((ing: any, index: number) => ({
        user_recipe_id: recipe.user_recipe_id,
        amount: ing.amount,
        unit: ing.unit,
        raw_name: ing.raw_name,
        order_index: index + 1
      }))

      await supabase
        .from('user_recipe_ingredients')
        .insert(ingredients)
    }

    // Create steps
    if (recipeData.steps?.length > 0) {
      const steps = recipeData.steps.map((step: any, index: number) => ({
        user_recipe_id: recipe.user_recipe_id,
        step_number: index + 1,
        text: step.text,
        order_index: index + 1
      }))

      await supabase
        .from('user_recipe_steps')
        .insert(steps)
    }

    // Update local storage with the new recipe ID
    const fullRecipe = { ...recipeData, user_recipe_id: recipe.user_recipe_id }
    await offlineStorage.saveRecipe(fullRecipe)
  }

  private async syncUpdateRecipe(recipeData: any): Promise<void> {
    const { supabase } = await import('./supabase')
    
    // Update recipe
    await supabase
      .from('user_recipes')
      .update({
        title: recipeData.title,
        description: recipeData.description,
        image_url: recipeData.image_url,
        prep_time: recipeData.prep_time,
        cook_time: recipeData.cook_time,
        servings: recipeData.servings,
        difficulty: recipeData.difficulty,
        source_name: recipeData.source_name,
        source_url: recipeData.source_url
      })
      .eq('user_recipe_id', recipeData.user_recipe_id)

    // Update local storage
    await offlineStorage.saveRecipe(recipeData)
  }

  private async syncDeleteRecipe(recipeData: any): Promise<void> {
    const { supabase } = await import('./supabase')
    
    await supabase
      .from('user_recipes')
      .delete()
      .eq('user_recipe_id', recipeData.user_recipe_id)

    // Remove from local storage
    await offlineStorage.deleteRecipe(recipeData.user_recipe_id)
  }

  async mirrorUserRecipes(): Promise<void> {
    if (!this.isOnline) return

    try {
      const { supabase } = await import('./supabase')
      const { getCurrentUser } = await import('./auth')
      
      const user = await getCurrentUser()
      if (!user) return

      // Fetch all user recipes with full data
      const { data: recipes, error } = await supabase
        .from('user_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name)
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching recipes for offline sync:', error)
        return
      }

      // Fetch ingredients, steps, equipment, and tags for each recipe
      for (const recipe of recipes || []) {
        const [ingredientsResult, stepsResult, equipmentResult, tagsResult] = await Promise.all([
          supabase
            .from('user_recipe_ingredients')
            .select('amount, unit, raw_name, ingredient:ingredients(name)')
            .eq('user_recipe_id', recipe.user_recipe_id),
          
          supabase
            .from('user_recipe_steps')
            .select('step_number, text')
            .eq('user_recipe_id', recipe.user_recipe_id)
            .order('step_number'),
          
          supabase
            .from('user_recipe_equipment')
            .select('equipment:equipment(name)')
            .eq('user_recipe_id', recipe.user_recipe_id),
          
          supabase
            .from('user_recipe_tags')
            .select('tag:tags(name)')
            .eq('user_recipe_id', recipe.user_recipe_id)
        ])

        const fullRecipe = {
          ...recipe,
          ingredients: ingredientsResult.data || [],
          steps: stepsResult.data || [],
          equipment: equipmentResult.data || [],
          tags: tagsResult.data || []
        }

        await offlineStorage.saveRecipe(fullRecipe)
      }

      // Cache recipe images
      await cacheManager.cacheRecipeImages(recipes || [])

    } catch (error) {
      console.error('Error mirroring recipes:', error)
    }
  }
}

export const syncManager = new SyncManager()
