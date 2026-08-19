import type { Category } from '../types'

/** 全局主题色常量，Tailwind @theme 与 ECharts 共用同源值 */
export const colors = {
  cream: '#F2EFE6',
  creamDark: '#CFC2A4',
  terracotta: '#0E3A2E',
  terracottaLight: '#FFD200',
  sage: '#2F6B4F',
  teal: '#1D5747',
  amber: '#B18F18',
  steel: '#496859',
  stone: '#171A18',
  stoneLight: '#5F5A4C',
} as const

/** 各类别对应的主题色 */
export const categoryColors: Record<Category, string> = {
  study: '#0E3A2E',
  meditation: '#2F6B4F',
  exercise: '#B18F18',
  reading: '#496859',
  gaming: '#765F22',
}
