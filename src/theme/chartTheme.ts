import type { EChartsOption } from 'echarts'
import type { CategoryDefinition } from '../types'
import { colors } from './colors'

/** ECharts 类别色序（与全局主题一致） */
export function chartCategoryColors(categories: readonly CategoryDefinition[]): string[] {
  return categories.map((category) => category.color)
}

/** 基础 tooltip 样式 */
export const baseTooltip = {
  trigger: 'axis' as const,
  backgroundColor: colors.cream,
  borderColor: colors.creamDark,
  borderWidth: 1,
  padding: [10, 12],
  extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(8,43,34,.14)',
  textStyle: { color: colors.stone, fontSize: 13 },
}

/** 折线图/面积图 legend */
export function categoryLegend(categories: readonly CategoryDefinition[]): EChartsOption['legend'] {
  return {
    data: categories.map((category) => category.label),
    bottom: 0,
    textStyle: { color: colors.stoneLight },
  }
}

/** 热力图 visualMap 渐变色 */
export const heatmapColors = [
  colors.creamDark,
  '#9B8A3A',
  '#55735F',
  colors.terracotta,
]

/** 在同一大类色基础上生成小类配色（由浅到深） */
export function subCategoryColors(baseHex: string, count: number): string[] {
  if (count <= 0) return []
  if (count === 1) return [baseHex]

  const r = parseInt(baseHex.slice(1, 3), 16)
  const g = parseInt(baseHex.slice(3, 5), 16)
  const b = parseInt(baseHex.slice(5, 7), 16)

  return Array.from({ length: count }, (_, i) => {
    const weight = 0.35 + (0.65 * i) / (count - 1)
    const mix = (channel: number) => Math.round(255 + (channel - 255) * weight)
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
  })
}

/** 空图表占位配置 */
export const emptyChartOption: EChartsOption = {
  title: {
    text: '还没有数据',
    left: 'center',
    top: 'center',
    textStyle: { color: colors.stoneLight, fontSize: 14, fontWeight: 'normal' },
  },
}
