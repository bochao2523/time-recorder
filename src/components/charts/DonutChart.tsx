import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { DailyRecord, TimeRange } from '../../types'
import { CATEGORY_LABELS, CATEGORIES } from '../../types'
import { aggregateByCategory } from '../../lib/stats'
import { formatMinutes } from '../../lib/dateUtils'
import { chartCategoryColors } from '../../theme/chartTheme'
import { colors } from '../../theme/colors'

interface DonutChartProps {
  records: DailyRecord[]
  range: TimeRange
}

export function DonutChart({ records, range }: DonutChartProps) {
  const totals = aggregateByCategory(records, range)
  const data = CATEGORIES.map((cat) => ({
    name: CATEGORY_LABELS[cat],
    value: totals[cat],
  })).filter((d) => d.value > 0)

  if (data.length === 0) return null

  const option: EChartsOption = {
    color: chartCategoryColors,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: colors.creamDark,
      textStyle: { color: colors.stone, fontSize: 13 },
      formatter: (p) => {
        const param = p as { name: string; value: number; percent: number }
        return `${param.name}<br/>${formatMinutes(param.value)} (${param.percent}%)`
      },
    },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'center',
      textStyle: { color: colors.stoneLight, fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data,
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
}
