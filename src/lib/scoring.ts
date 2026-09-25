import type { CompetencyForm, Rating, Score } from './types'

const EMPTY: Record<Rating, number> = { M: 0, NM: 0, NA: 0, VT: 0, RD: 0, UEC: 0 }

/**
 * Score one form the way the paper form does:
 * Raw Score = M entries, Total Score = M + NM (NA is deducted), Met = 90% - 100%.
 * The equipment checklist (VT/RD/UEC) has no percentage.
 */
export function scoreForm(form: CompetencyForm, answers: Record<string, Rating | undefined>): Score {
  const counts = { ...EMPTY }
  let total = 0
  for (const section of form.sections) {
    for (const item of section.items) {
      total += 1
      const answer = answers[item.id]
      if (answer) counts[answer] += 1
    }
  }
  const answered = Object.values(counts).reduce((a, b) => a + b, 0)
  const raw = counts.M
  const totalApplicable = counts.M + counts.NM
  const percent = form.scale === 'mnmna' && totalApplicable > 0 ? (raw / totalApplicable) * 100 : null
  const result = answered < total
    ? 'Incomplete'
    : form.scale === 'equipment'
      ? 'Complete'
      : percent !== null && percent >= 90 ? 'Met' : 'Not Met'
  return { counts, answered, total, raw, totalApplicable, percent, result }
}

export function percentLabel(value: number | null) {
  if (value === null) return '—'
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}
