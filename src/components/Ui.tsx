import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass-card ${className}`}>{children}</section>
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-state">
      <LoaderCircle className="spin" size={28} />
      <span>{label}</span>
    </div>
  )
}

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  in_progress: { ar: 'قيد التقييم', en: 'In progress' },
  submitted: { ar: 'بانتظار المراجعة', en: 'Awaiting review' },
  completed: { ar: 'معتمد', en: 'Approved' },
  reopened: { ar: 'أعيد فتحه', en: 'Reopened' },
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll(' ', '-')
  const label = STATUS_LABEL[status]
  const text = label ? (document.documentElement.lang === 'ar' ? label.ar : label.en) : status
  return <span className={`status-badge status-${normalized}`}>{text}</span>
}

export function Metric({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
