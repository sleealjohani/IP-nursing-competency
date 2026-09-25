import { zipSync } from 'fflate'
import { forms } from './content'
import { bundlePdf, type FillInput } from './pdf'
import { signatureBytes } from './signatures'
import type { AnswerRow, NurseRow, Rating, ReviewRow, SessionRow } from './types'

export type DashboardData = { sessions: SessionRow[]; nurses: NurseRow[]; answers: AnswerRow[]; reviews: ReviewRow[] }

const safeName = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim() || 'nurse'

/**
 * One PDF per nurse, named after the nurse, containing every competency form approved (finalized)
 * for that nurse — taken from the nurse's most recent assessment that has approved forms.
 */
export async function approvedFormsZip(data: DashboardData, onProgress?: (done: number, total: number) => void) {
  const approvedBySession = new Map<string, ReviewRow[]>()
  for (const r of data.reviews) if (r.finalized) approvedBySession.set(r.session_id, [...(approvedBySession.get(r.session_id) || []), r])

  const latest = new Map<string, SessionRow>()
  for (const s of data.sessions) {
    if (!approvedBySession.has(s.id)) continue
    const prev = latest.get(s.nurse_id)
    const at = (x: SessionRow) => x.completed_at || x.submitted_at || x.updated_at
    if (!prev || at(s) > at(prev)) latest.set(s.nurse_id, s)
  }

  const jobs = [...latest.values()].map(session => ({ session, nurse: data.nurses.find(n => n.id === session.nurse_id)! })).filter(j => j.nurse)
  const nameCount = new Map<string, number>()
  jobs.forEach(j => nameCount.set(safeName(j.nurse.name), (nameCount.get(safeName(j.nurse.name)) || 0) + 1))

  const files: Record<string, Uint8Array> = {}
  let done = 0
  for (const { session, nurse } of jobs) {
    const reviews = approvedBySession.get(session.id)!
    const answers = Object.fromEntries(data.answers.filter(a => a.session_id === session.id).map(a => [a.question_id, a.answer])) as Record<string, Rating>
    const inputs: FillInput[] = []
    for (const form of forms) {
      const review = reviews.find(r => r.competency_id === form.id)
      if (!review) continue
      inputs.push({ form, nurse, answers, review, evaluator: review.evaluator_snapshot, evaluatorSignature: await signatureBytes(review.evaluator_snapshot?.signature_path), confirmedAt: session.submitted_at })
    }
    const base = safeName(nurse.name)
    const fileName = `${(nameCount.get(base) || 0) > 1 ? `${base} (${safeName(nurse.job_number)})` : base}.pdf`
    files[fileName] = await bundlePdf(inputs, `Competency forms — ${nurse.name} (${nurse.job_number})`)
    onProgress?.(++done, jobs.length)
  }
  if (!jobs.length) return { bytes: null, count: 0 }
  // PDFs are already compressed: store them as-is; fflate marks non-ASCII (Arabic) names as UTF-8.
  const bytes = zipSync(Object.fromEntries(Object.entries(files).map(([n, b]) => [n, [b, { level: 0 }]])), { mtime: new Date() })
  return { bytes, count: jobs.length }
}

export function downloadZip(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
