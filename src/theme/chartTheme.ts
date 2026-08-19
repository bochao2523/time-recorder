import type { EChartsOption } from 'echarts'
import { CATEGORY_LABELS, CATEGORIES } from '../types'
import { categoryColors, colors } from './colors'

/** ECharts 类别色序（与全局主题一致） */
export const chartCategoryColors = CATEGORIES.map((cat) => categoryColors[cat])

/** 基础 tooltip 样式 */
export const baseTooltip = {
  trigger: 'axis' as const,
  backgroundColor: '#fff',
  borderColor: colors.creamDark,
  borderWidth: 1,
  padding: [10, 12],
  extraCssText: 'border-radius:12px;box-shadow:0 8px 28px rgba(48,44,41,.12)',
  textStyle: { color: colors.stone, fontSize: 13 },
}

/** 折线图/面积图 legend */
export function categoryLegend(): EChartsOption['legend'] {
  return {
    data: CATEGORIES.map((c) => CATEGORY_LABELS[c]),
    bottom: 0,
    textStyle: { color: colors.stoneLight },
  }
}

/** 热力图 visualMap 渐变色 */
export const heatmapColors = [
  colors.creamDark,
  colors.terracottaLight,
  colors.terracotta,
  '#B94E36',
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
