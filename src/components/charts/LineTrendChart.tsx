import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { DailyRecord, TimeRange } from '../../types'
import { CATEGORY_LABELS, CATEGORIES } from '../../types'
import { buildChartSeries } from '../../lib/stats'
import { formatShortDate } from '../../lib/dateUtils'
import { baseTooltip, categoryLegend, chartCategoryColors } from '../../theme/chartTheme'
import { colors } from '../../theme/colors'

interface LineTrendChartProps {
  records: DailyRecord[]
  range: TimeRange
}

export function LineTrendChart({ records, range }: LineTrendChartProps) {
  const { dates, series } = buildChartSeries(records, range)
  const hasData = dates.some((_, i) => CATEGORIES.some((c) => series[c][i] > 0))

  if (!hasData) return null

  const option: EChartsOption = {
    color: chartCategoryColors,
    tooltip: {
      ...baseTooltip,
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const date = String((params[0] as { axisValue?: string }).axisValue ?? '')
        const lines = params.map(
          (p) => `${p.marker}${p.seriesName}: ${p.value} 分钟`,
        )
        return `${date}<br/>${lines.join('<br/>')}`
      },
    },
    legend: categoryLegend(),
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
    series: CATEGORIES.map((cat) => ({
      name: CATEGORY_LABELS[cat],
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: series[cat],
    })),
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
}
