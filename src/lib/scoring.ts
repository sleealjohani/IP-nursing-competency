import type { CompetencyQuestion, Rating, Score } from './types'

export function scoreQuestions(
  questions: CompetencyQuestion[],
  answers: Record<string, Rating>,
): Score {
  let m = 0
  let nm = 0
  let na = 0

  for (const question of questions) {
    const answer = answers[question.id]
    if (answer === 'M') m += 1
    if (answer === 'NM') nm += 1
    if (answer === 'NA') na += 1
  }

  const answered = m + nm + na
  const totalApplicable = m + nm
  const percent = totalApplicable > 0 ? (m / totalApplicable) * 100 : null
  const result = answered < questions.length
    ? 'Incomplete'
    : percent !== null && percent >= 90
      ? 'Met'
      : 'Not Met'

  return { m, nm, na, answered, totalApplicable, percent, result }
}

export function percentLabel(value: number | null) {
  if (value === null) return '—'
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}
