/** The design system's signature: every form is a dot on an orbit around the Health Holding star. */
export function Orbit({ total, done, current, size = 180, label, showCount = true }: { total: number; done: number; current?: number; size?: number; label: string; showCount?: boolean }) {
  const r = 86
  const rtl = document.documentElement.dir === 'rtl'
  const dots = Array.from({ length: total }, (_, i) => {
    const a = -Math.PI / 2 + (rtl ? -1 : 1) * (i / total) * Math.PI * 2
    const state = i === current ? 'current' : i < done ? 'done' : 'todo'
    return <circle key={i} cx={100 + r * Math.cos(a)} cy={100 + r * Math.sin(a)} r={state === 'current' ? 5.5 : 3.8} className={`orbit-dot ${state}`} />
  })
  return (
    <figure className={`orbit ${size < 100 ? 'small' : ''}`} style={{ width: size, height: size, margin: 0 }} role="img" aria-label={label}>
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
        <circle cx="100" cy="100" r={r} className="orbit-track" />
        {dots}
      </svg>
      <figcaption className="orbit-center" aria-hidden="true">
        <img src="/brand/hh-star.svg" alt="" />
        {showCount && <><strong dir="ltr">{done}</strong><small>/ {total}</small></>}
      </figcaption>
    </figure>
  )
}
