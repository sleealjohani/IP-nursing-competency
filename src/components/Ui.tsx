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

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll(' ', '-')
  return <span className={`status-badge status-${normalized}`}>{status}</span>
}

export function Metric({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
