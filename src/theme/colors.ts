import type { Category } from '../types'

/** 全局主题色常量，Tailwind @theme 与 ECharts 共用同源值 */
export const colors = {
  cream: '#F7F5F2',
  creamDark: '#E8E3DD',
  terracotta: '#DF684B',
  terracottaLight: '#F5A08A',
  sage: '#62977A',
  teal: '#538E98',
  amber: '#BE8849',
  steel: '#687DA6',
  stone: '#302C29',
  stoneLight: '#716A64',
} as const

/** 各类别对应的主题色 */
export const categoryColors: Record<Category, string> = {
  study: colors.terracotta,
  meditation: colors.teal,
  exercise: colors.sage,
  reading: colors.amber,
  gaming: colors.steel,
}
