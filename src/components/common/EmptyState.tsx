interface EmptyStateProps {
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ message = '还没有数据', actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-36 flex-col items-center justify-center px-5 py-8 text-center text-stone-light">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-terracotta/60">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
      </span>
      <p className="max-w-64 text-sm leading-relaxed">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 min-h-11 rounded-full bg-terracotta px-5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(223,104,75,0.2)] active:scale-[0.97]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
