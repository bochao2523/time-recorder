import {
  DEFAULT_CATEGORY_DEFINITIONS,
  type Category,
  type CategoryDefinition,
} from '../types'

export const CATEGORY_STORAGE_KEY = 'time-tracker:categories'

const CUSTOM_COLORS = ['#6C4D7D', '#3B6B77', '#8A4B4B', '#596C35', '#8B6236', '#496859']

function cloneDefaults(): CategoryDefinition[] {
  return DEFAULT_CATEGORY_DEFINITIONS.map((category) => ({ ...category }))
}

function isCategoryDefinition(value: unknown): value is CategoryDefinition {
  if (!value || typeof value !== 'object') return false
  const category = value as Record<string, unknown>
  return (
    typeof category.id === 'string' &&
    category.id.length > 0 &&
    typeof category.label === 'string' &&
    category.label.trim().length > 0 &&
    typeof category.color === 'string' &&
    /^#[0-9a-f]{6}$/i.test(category.color) &&
    typeof category.active === 'boolean' &&
    (category.builtin === undefined || typeof category.builtin === 'boolean')
  )
}

function normalizeDefinitions(raw: CategoryDefinition[]): CategoryDefinition[] {
  const byId = new Map<Category, CategoryDefinition>()
  for (const category of raw) {
    byId.set(category.id, {
      ...category,
      label: category.label.trim().slice(0, 12),
      color: category.color.toUpperCase(),
    })
  }
  for (const fallback of DEFAULT_CATEGORY_DEFINITIONS) {
    if (!byId.has(fallback.id)) byId.set(fallback.id, { ...fallback })
  }
  return Array.from(byId.values())
}

export function loadCategoryDefinitions(): CategoryDefinition[] {
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY)
    if (!raw) return cloneDefaults()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isCategoryDefinition)) return cloneDefaults()
    return normalizeDefinitions(parsed)
  } catch {
    return cloneDefaults()
  }
}

export function saveCategoryDefinitions(categories: CategoryDefinition[]): void {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories))
}

export function createCustomCategory(label: string, existing: CategoryDefinition[]): CategoryDefinition {
  const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const customCount = existing.filter((category) => !category.builtin).length
  return {
    id,
    label: label.trim().slice(0, 12),
    color: CUSTOM_COLORS[customCount % CUSTOM_COLORS.length],
    active: true,
  }
}

export function mergeCategoryDefinitions(
  current: CategoryDefinition[],
  incoming: CategoryDefinition[],
): CategoryDefinition[] {
  return normalizeDefinitions([
    ...current,
    ...incoming.filter(isCategoryDefinition),
  ])
}

export function fallbackCategoryDefinition(id: Category): CategoryDefinition {
  const builtin = DEFAULT_CATEGORY_DEFINITIONS.find((category) => category.id === id)
  return builtin ? { ...builtin } : { id, label: id, color: '#496859', active: false }
}
