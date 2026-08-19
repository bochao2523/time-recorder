interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: string
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-cream-dark/70 bg-white p-3.5 shadow-[0_4px_18px_rgba(48,44,41,0.045)]">
      <div className="mb-2 h-1 w-7 rounded-full" style={{ backgroundColor: accent ?? 'var(--color-terracotta)' }} />
      <p className="truncate text-xs font-medium text-stone-light">{label}</p>
      <p
        className="mt-1 truncate text-xl font-semibold tracking-tight text-stone-800"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-stone-light">{sub}</p>}
    </div>
  )
}
