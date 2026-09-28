import type { CSSProperties } from 'react'
import type { CategoryDefinition } from '../../types'
import './DailyCompletionCelebration.css'

interface DailyCompletionCelebrationProps {
  categories: CategoryDefinition[]
  visible: boolean
}

type ParticleStyle = CSSProperties & {
  '--completion-color': string
  '--completion-x': string
  '--completion-y': string
  '--completion-rotation': string
  '--completion-delay': string
}

export function DailyCompletionCelebration({
  categories,
  visible,
}: DailyCompletionCelebrationProps) {
  if (!visible) return null

  const visibleCategories = categories.slice(0, 10)

  return (
    <div
      className="daily-completion-celebration"
      role="status"
      aria-live="polite"
      aria-label={`今日全部 ${categories.length} 个任务大类均已记录`}
    >
      <div className="daily-completion-burst" aria-hidden>
        {visibleCategories.map((category, index) => {
          const angle = (Math.PI * 2 * index) / Math.max(visibleCategories.length, 1) - Math.PI / 2
          const radiusX = 138 + (index % 2) * 18
          const radiusY = 82 + ((index + 1) % 2) * 16
          const style: ParticleStyle = {
            '--completion-color': category.color,
            '--completion-x': `${Math.cos(angle) * radiusX}px`,
            '--completion-y': `${Math.sin(angle) * radiusY}px`,
            '--completion-rotation': `${Math.round((angle * 180) / Math.PI + 90)}deg`,
            '--completion-delay': `${index * 45}ms`,
          }
          return (
            <span
              key={category.id}
              className="daily-completion-ticket"
              style={style}
            >
              {category.label}
            </span>
          )
        })}
      </div>

      <div className="daily-completion-stamp">
        <span className="daily-completion-check" aria-hidden>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4L19 6" />
          </svg>
        </span>
        <strong>今日全勤</strong>
        <span>{categories.length} 项都留下了时间</span>
      </div>
    </div>
  )
}
