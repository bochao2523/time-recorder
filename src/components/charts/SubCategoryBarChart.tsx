import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { CategoryDefinition } from '../../types'
import type { SubItemAggregate } from '../../lib/stats'
import { formatMinutes } from '../../lib/dateUtils'
import { subCategoryColors } from '../../theme/chartTheme'
import { colors } from '../../theme/colors'

interface SubCategoryBarChartProps {
  category: CategoryDefinition
  data: SubItemAggregate[]
}

export function SubCategoryBarChart({ category, data }: SubCategoryBarChartProps) {
  const chartData = [...data].filter((d) => d.minutes > 0).sort((a, b) => b.minutes - a.minutes)
  if (chartData.length === 0) return null

  const baseColor = category.color
  const palette = subCategoryColors(baseColor, chartData.length).reverse()
  const names = chartData.map((d) => d.name)
  const values = chartData.map((d) => d.minutes)
  const chartWidth = Math.max(320, chartData.length * 64)

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
    grid: { left: 8, right: 12, top: 28, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: colors.creamDark } },
      axisTick: { show: false },
      axisLabel: {
        interval: 0,
        color: colors.stone,
        fontSize: 11,
        width: 56,
        lineHeight: 14,
        formatter: (value: string) => {
          const label = String(value)
          if (label.length <= 4) return label
          if (label.length <= 8) return `${label.slice(0, 4)}\n${label.slice(4)}`
          return `${label.slice(0, 4)}\n${label.slice(4, 7)}…`
        },
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      name: '分钟',
      nameTextStyle: { color: colors.stoneLight, fontSize: 10, align: 'right' },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.stoneLight, fontSize: 10 },
      splitLine: { lineStyle: { color: colors.creamDark } },
    },
    series: [
      {
        name: category.label,
        type: 'bar',
        data: values.map((value, i) => ({
          value,
          itemStyle: { color: palette[i], borderRadius: [5, 5, 0, 0] },
        })),
        barMaxWidth: 32,
        label: {
          show: true,
          position: 'top',
          color: colors.stoneLight,
          fontSize: 10,
          formatter: '{c} 分',
        },
      },
    ],
  }

  return (
    <div
      className="h-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={`${category.label}项目竖向柱状图，按时间从高到低排列`}
    >
      <ReactECharts
        option={option}
        style={{ height: '100%', width: chartWidth, minWidth: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
