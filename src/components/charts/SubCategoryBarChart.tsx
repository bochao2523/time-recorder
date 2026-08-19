import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { Category } from '../../types'
import { CATEGORY_LABELS } from '../../types'
import type { SubItemAggregate } from '../../lib/stats'
import { formatMinutes } from '../../lib/dateUtils'
import { subCategoryColors } from '../../theme/chartTheme'
import { categoryColors, colors } from '../../theme/colors'

interface SubCategoryBarChartProps {
  category: Category
  data: SubItemAggregate[]
}

export function SubCategoryBarChart({ category, data }: SubCategoryBarChartProps) {
  const chartData = [...data].filter((d) => d.minutes > 0).sort((a, b) => a.minutes - b.minutes)
  if (chartData.length === 0) return null

  const baseColor = categoryColors[category]
  const palette = subCategoryColors(baseColor, chartData.length)
  const names = chartData.map((d) => d.name)
  const values = chartData.map((d) => d.minutes)

  const option: EChartsOption = {
    color: palette,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fff',
      borderColor: colors.creamDark,
      textStyle: { color: colors.stone, fontSize: 13 },
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const p = params[0] as { name: string; value: number }
        return `${p.name}<br/>${formatMinutes(p.value)}`
      },
    },
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { color: colors.stoneLight, fontSize: 10 },
      axisLabel: { color: colors.stoneLight, fontSize: 10 },
      splitLine: { lineStyle: { color: colors.creamDark } },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.stone,
        fontSize: 11,
        width: 72,
        overflow: 'truncate',
      },
    },
    series: [
      {
        name: CATEGORY_LABELS[category],
        type: 'bar',
        data: values.map((value, i) => ({
          value,
          itemStyle: { color: palette[i], borderRadius: [0, 4, 4, 0] },
        })),
        barMaxWidth: 20,
        label: {
          show: true,
          position: 'right',
          color: colors.stoneLight,
          fontSize: 10,
          formatter: '{c} 分',
        },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
}
