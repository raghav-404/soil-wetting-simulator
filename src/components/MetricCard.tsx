import type { LucideIcon } from 'lucide-react'

interface Props { label: string; value: string; meta?: string; icon: LucideIcon; tone?: 'aqua' | 'amber' | 'green' | 'neutral' }

export function MetricCard({ label, value, meta, icon: Icon, tone = 'neutral' }: Props) {
  return <div className={`metric-card tone-${tone}`}>
    <div className="metric-icon"><Icon size={17} strokeWidth={1.8} /></div>
    <div><span className="metric-label">{label}</span><strong>{value}</strong>{meta && <small>{meta}</small>}</div>
  </div>
}
