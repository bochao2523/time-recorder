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
  study: '#00A878',
  meditation: '#E83E72',
  exercise: '#EFA400',
  reading: '#276EF1',
  gaming: '#F46D16',
}

function relativeLuminance(hex: string): number {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'
  const channels = [1, 3, 5].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255)
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
}

/** 分类色可以鲜艳；分类图标根据底色自动选择深色或浅色前景。 */
export function categoryForeground(background: string): string {
  const light = colors.cream
  const dark = '#082B22'
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light
}
