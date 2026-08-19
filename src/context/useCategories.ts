import { useContext } from 'react'
import { CategoriesContext, type CategoriesContextValue } from './categories'

export function useCategories(): CategoriesContextValue {
  const context = useContext(CategoriesContext)
  if (!context) throw new Error('useCategories must be used within CategoriesProvider')
  return context
}
