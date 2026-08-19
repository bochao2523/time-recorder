import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { CategoryDefinition, DailyRecord, TimeRange } from '../../types'
import { buildChartSeries } from '../../lib/stats'
import { formatShortDate } from '../../lib/dateUtils'
import { baseTooltip, categoryLegend, chartCategoryColors } from '../../theme/chartTheme'
import { colors } from '../../theme/colors'

interface StackedAreaChartProps {
  records: DailyRecord[]
  range: TimeRange
  categories: CategoryDefinition[]
}

export function StackedAreaChart({ records, range, categories }: StackedAreaChartProps) {
  const categoryIds = categories.map((category) => category.id)
  const { dates, series } = buildChartSeries(records, range, categoryIds)
  const hasData = dates.some((_, i) => categoryIds.some((category) => series[category][i] > 0))

  if (!hasData) return null

  const option: EChartsOption = {
    color: chartCategoryColors(categories),
    tooltip: {
      ...baseTooltip,
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const date = String((params[0] as { axisValue?: string }).axisValue ?? '')
        const total = params.reduce((s, p) => s + (Number(p.value) || 0), 0)
        const lines = params.map(
          (p) => `${p.marker}${p.seriesName}: ${p.value} 分钟`,
        )
        return `${date}<br/>${lines.join('<br/>')}<br/>合计: ${total} 分钟`
      },
    },
    legend: categoryLegend(categories),
    grid: { left: 40, right: 16, top: 16, bottom: 48 },
    xAxis: {
      type: 'category',
      data: dates.map(formatShortDate),
      axisLine: { lineStyle: { color: colors.creamDark } },
      axisLabel: { color: colors.stoneLight, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { color: colors.stoneLight, fontSize: 11 },
      axisLabel: { color: colors.stoneLight, fontSize: 11 },
      splitLine: { lineStyle: { color: colors.creamDark } },
    },
    series: categories.map((category) => ({
      name: category.label,
      type: 'line',
      stack: 'total',
      areaStyle: { opacity: 0.6 },
      emphasis: { focus: 'series' },
      data: series[category.id],
    })),
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
}
