'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RouteGuard } from '@/components/route-guard'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/auth'
import { Plus, Edit, Trash2, Save, X, ChefHat, Utensils, Package, Tag, Settings } from 'lucide-react'

interface ReferenceItem {
  id: number
  name: string
}

interface CategoryItem extends ReferenceItem {
  category_id?: number
}

export default function AdminReferencePage() {
  const [activeTab, setActiveTab] = useState<'cuisines' | 'meal_types' | 'categories' | 'ingredients' | 'equipment' | 'tags'>('cuisines')
  const [items, setItems] = useState<ReferenceItem[]>([])
  const [categories, setCategories] = useState<ReferenceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<ReferenceItem | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  const tableConfig = {
    cuisines: {
      title: 'Cuisines',
      icon: ChefHat,
      table: 'cuisines',
      idField: 'cuisine_id',
      nameField: 'name'
    },
    meal_types: {
      title: 'Meal Types',
      icon: Utensils,
      table: 'meal_types',
      idField: 'meal_type_id',
      nameField: 'name'
    },
    categories: {
      title: 'Ingredient Categories',
      icon: Package,
      table: 'ingredient_categories',
      idField: 'category_id',
      nameField: 'name'
    },
    ingredients: {
      title: 'Ingredients',
      icon: Tag,
      table: 'ingredients',
      idField: 'ingredient_id',
      nameField: 'name',
      requiresCategory: true
    },
    equipment: {
      title: 'Equipment',
      icon: Settings,
      table: 'equipment',
      idField: 'equipment_id',
      nameField: 'name'
    },
    tags: {
      title: 'Tags',
      icon: Tag,
      table: 'tags',
      idField: 'tag_id',
      nameField: 'name'
    }
  }

  useEffect(() => {
    loadItems()
    if (activeTab === 'ingredients') {
      loadCategories()
    }
  }, [activeTab])

  const loadItems = async () => {
    setLoading(true)
    try {
      const config = tableConfig[activeTab]
      const selectQuery = activeTab === 'ingredients' 
        ? `*,ingredient_categories(category_id,name)` 
        : '*'
      const query = supabase.from(config.table).select(selectQuery).order(config.nameField)
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error loading items:', error)
        return
      }
      
      // Map the specific ID field to generic 'id' field
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        id: item[config.idField]
      }))
      
      setItems(mappedData)
    } catch (error) {
      console.error('Error loading items:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('ingredient_categories')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Error loading categories:', error)
        return
      }
      
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleAdd = async () => {
    if (!newItemName.trim()) return
    
    const config = tableConfig[activeTab]
    const itemData: any = { [config.nameField]: newItemName.trim() }
    
    if (activeTab === 'ingredients' && selectedCategory) {
      itemData.category_id = selectedCategory
    }
    
    try {
      const { data, error } = await supabase
        .from(config.table)
        .insert(itemData)
        .select()
        .single()
      
      if (error) {
        console.error('Error adding item:', error)
        return
      }
      
      setNewItemName('')
      setSelectedCategory(null)
      loadItems()
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleEdit = async () => {
    if (!editingItem || !newItemName.trim()) return
    
    const config = tableConfig[activeTab]
    const itemData: any = { [config.nameField]: newItemName.trim() }
    
    // Only include category_id if it's defined and we're editing ingredients
    if (activeTab === 'ingredients' && selectedCategory !== null && selectedCategory !== undefined) {
      itemData.category_id = selectedCategory
    }
    
    try {
      const { error } = await supabase
        .from(config.table)
        .update(itemData)
        .eq(config.idField, editingItem.id)
      
      if (error) {
        console.error('Error updating item:', error)
        return
      }
      
      setEditingItem(null)
      setNewItemName('')
      setSelectedCategory(null)
      loadItems()
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDelete = async (item: ReferenceItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return
    
    const config = tableConfig[activeTab]
    
    try {
      const { error } = await supabase
        .from(config.table)
        .delete()
        .eq(config.idField, item.id)
      
      if (error) {
        console.error('Error deleting item:', error)
        return
      }
      
      loadItems()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const startEdit = (item: ReferenceItem) => {
    setEditingItem(item)
    setNewItemName(item.name)
    if (activeTab === 'ingredients' && 'category_id' in item) {
      setSelectedCategory(typeof item.category_id === 'number' ? item.category_id : null)
    }
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setNewItemName('')
    setSelectedCategory(null)
  }

  const tabs = [
    { key: 'cuisines', label: 'Cuisines', icon: ChefHat },
    { key: 'meal_types', label: 'Meal Types', icon: Utensils },
    { key: 'categories', label: 'Categories', icon: Package },
    { key: 'ingredients', label: 'Ingredients', icon: Tag },
    { key: 'equipment', label: 'Equipment', icon: Settings },
    { key: 'tags', label: 'Tags', icon: Tag }
  ] as const

  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-orange-900 mb-2">
                Reference Data Management
              </h1>
              <p className="text-orange-700">
                Manage cuisines, meal types, ingredients, equipment, and tags
              </p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? 'default' : 'outline'}
                    onClick={() => setActiveTab(tab.key)}
                    className={activeTab === tab.key ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-300 text-orange-700 hover:bg-orange-50'}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Button>
                )
              })}
            </div>

            {/* Add New Item */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add New {activeTab === 'categories' ? 'Ingredient Category' : tableConfig[activeTab].title.slice(0, -1)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder={`Enter ${tableConfig[activeTab].title.slice(0, -1).toLowerCase()} name`}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingItem) handleEdit()
                        else handleAdd()
                      }
                    }}
                  />
                  
                  {activeTab === 'ingredients' && (
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                      className="px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {editingItem ? (
                    <div className="flex gap-2">
                      <Button onClick={handleEdit} className="bg-orange-600 hover:bg-orange-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={cancelEdit}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {tableConfig[activeTab].title} ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No {tableConfig[activeTab].title.toLowerCase()} found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-white">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {activeTab === 'ingredients' && 'category_id' in item && (
                            <Badge variant="outline" className="mt-1">
                              {categories.find(c => c.id === item.category_id)?.name || 'Unknown Category'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
