import { createContext } from 'react'
import type { Category, CategoryDefinition } from '../types'

export interface CategoryActionResult {
  ok: boolean
  message: string
}

export interface CategoriesContextValue {
  categories: CategoryDefinition[]
  activeCategories: CategoryDefinition[]
  archivedCategories: CategoryDefinition[]
  getCategory: (id: Category) => CategoryDefinition
  addCategory: (label: string) => CategoryActionResult
  removeCategory: (id: Category) => CategoryActionResult
  restoreCategory: (id: Category) => CategoryActionResult
  importCategoryDefinitions: (definitions: CategoryDefinition[]) => void
}

export const CategoriesContext = createContext<CategoriesContextValue | null>(null)
