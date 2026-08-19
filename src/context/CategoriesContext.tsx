import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Category, CategoryDefinition } from '../types'
import { CategoriesContext, type CategoryActionResult } from './categories'
import {
  createCustomCategory,
  fallbackCategoryDefinition,
  loadCategoryDefinitions,
  mergeCategoryDefinitions,
  saveCategoryDefinitions,
} from '../lib/categoryStorage'

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryDefinition[]>(() => loadCategoryDefinitions())

  const commit = useCallback((update: (current: CategoryDefinition[]) => CategoryDefinition[]) => {
    setCategories((current) => {
      const next = update(current)
      saveCategoryDefinitions(next)
      return next
    })
  }, [])

  const addCategory = useCallback((rawLabel: string): CategoryActionResult => {
    const label = rawLabel.trim()
    if (!label) return { ok: false, message: '先输入大类名称' }
    if (label.length > 12) return { ok: false, message: '大类名称最多 12 个字' }

    const existing = categories.find((category) => category.label === label)
    if (existing?.active) return { ok: false, message: '这个大类已经存在' }
    if (existing) {
      commit((current) => current.map((category) => (
        category.id === existing.id ? { ...category, active: true } : category
      )))
      return { ok: true, message: `已恢复「${label}」` }
    }

    commit((current) => [...current, createCustomCategory(label, current)])
    return { ok: true, message: `已添加「${label}」` }
  }, [categories, commit])

  const removeCategory = useCallback((id: Category): CategoryActionResult => {
    const target = categories.find((category) => category.id === id)
    if (!target?.active) return { ok: false, message: '这个大类已经删除' }
    if (categories.filter((category) => category.active).length <= 1) {
      return { ok: false, message: '至少保留一个任务大类' }
    }
    commit((current) => current.map((category) => (
      category.id === id ? { ...category, active: false } : category
    )))
    return { ok: true, message: `已删除「${target.label}」，历史记录仍保留` }
  }, [categories, commit])

  const restoreCategory = useCallback((id: Category): CategoryActionResult => {
    const target = categories.find((category) => category.id === id)
    if (!target) return { ok: false, message: '没有找到这个大类' }
    commit((current) => current.map((category) => (
      category.id === id ? { ...category, active: true } : category
    )))
    return { ok: true, message: `已恢复「${target.label}」` }
  }, [categories, commit])

  const getCategory = useCallback(
    (id: Category) => categories.find((category) => category.id === id) ?? fallbackCategoryDefinition(id),
    [categories],
  )

  const importCategoryDefinitions = useCallback((definitions: CategoryDefinition[]) => {
    commit((current) => mergeCategoryDefinitions(current, definitions))
  }, [commit])

  const value = useMemo(() => ({
    categories,
    activeCategories: categories.filter((category) => category.active),
    archivedCategories: categories.filter((category) => !category.active),
    getCategory,
    addCategory,
    removeCategory,
    restoreCategory,
    importCategoryDefinitions,
  }), [categories, getCategory, addCategory, removeCategory, restoreCategory, importCategoryDefinitions])

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}
