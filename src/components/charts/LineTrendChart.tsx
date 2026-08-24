import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { CategoryDefinition, DailyRecord, TimeRange } from '../../types'
import { buildChartSeries } from '../../lib/stats'
import { formatShortDate } from '../../lib/dateUtils'
import { baseTooltip, chartCategoryColors } from '../../theme/chartTheme'
import { colors } from '../../theme/colors'

interface LineTrendChartProps {
  records: DailyRecord[]
  range: TimeRange
  categories: CategoryDefinition[]
}

export function LineTrendChart({ records, range, categories }: LineTrendChartProps) {
  const categoryIds = categories.map((category) => category.id)
  const { dates, series } = buildChartSeries(records, range, categoryIds)
  const chartCategories = categories.filter((category) => series[category.id].some((value) => value > 0))
  const hasData = chartCategories.length > 0

  if (!hasData) return null

  const option: EChartsOption = {
    color: chartCategoryColors(chartCategories),
    tooltip: {
      ...baseTooltip,
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const date = String((params[0] as { axisValue?: string }).axisValue ?? '')
        const lines = params
          .filter((p) => Number((p as { value?: number }).value ?? 0) > 0)
          .map((p) => `${p.marker}${p.seriesName}: ${p.value} 分钟`)
        return `${date}<br/>${lines.join('<br/>')}`
      },
    },
    legend: {
      type: 'scroll',
      top: 0,
      left: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 12,
      pageIconSize: 10,
      pageTextStyle: { color: colors.stoneLight, fontSize: 10 },
      textStyle: { color: colors.stoneLight, fontSize: 11 },
      data: chartCategories.map((category) => category.label),
    },
    grid: { left: 8, right: 8, top: 44, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates.map(formatShortDate),
      axisLine: { lineStyle: { color: colors.creamDark } },
      axisTick: { show: false },
      axisLabel: {
        color: colors.stoneLight,
        fontSize: 10,
        hideOverlap: true,
        margin: 10,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      name: '分钟',
      nameTextStyle: { color: colors.stoneLight, fontSize: 11 },
      axisLabel: { color: colors.stoneLight, fontSize: 11 },
      splitLine: { lineStyle: { color: colors.creamDark } },
    },
    series: chartCategories.map((category) => ({
      name: category.label,
      type: 'bar',
      stack: 'daily-total',
      barMaxWidth: 30,
      emphasis: { focus: 'series' },
      itemStyle: { borderRadius: [3, 3, 0, 0] },
      data: series[category.id],
    })),
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
}
