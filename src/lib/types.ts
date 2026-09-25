export type Rating = 'M' | 'NM' | 'NA' | 'VT' | 'RD' | 'UEC'

export type Scale = 'mnmna' | 'equipment'

export type SectionKey = 'knowledge' | 'skills' | 'attitude' | 'equipment'

export type FormItem = {
  id: string
  /** AcroForm field prefix on the PDF template, e.g. "knowledge_3" or "eq_7" */
  field: string
  n: number
  /** Number exactly as printed in the first column of the form */
  label: string
  text: string
  /** Arabic translation shown on the website only; the PDF always prints `text`. */
  text_ar?: string | null
}

export type FormSection = {
  key: SectionKey
  numeral: string
  title: string
  items: FormItem[]
}

export type CompetencyForm = {
  id: string
  code: string
  title: string
  title_ar?: string | null
  category: string
  department: string | null
  file: string
  scale: Scale
  pages: number
  sections: FormSection[]
}

export type NurseIdentity = {
  name: string
  job_number: string
  unit?: string | null
  job_title?: string | null
  contract_date?: string | null
}

export type NurseStartInput = {
  name: string
  job_number: string
  unit: string
  job_title: string
  contract_date: string
}

export type NurseSessionPayload = {
  ok?: boolean
  status?: 'in_progress' | 'submitted' | 'reopened' | 'completed'
  resume_code?: string
  started_at?: string
  submitted_at?: string | null
  nurse?: NurseIdentity
  answers?: Record<string, Rating>
  error?: string
  missing?: number
  saved?: number
  token?: string
}

export type NurseRow = {
  id: string
  name: string
  job_number: string
  unit: string | null
  job_title: string | null
  contract_date: string | null
}

export type SessionRow = {
  id: string
  nurse_id: string
  status: 'in_progress' | 'submitted' | 'reopened' | 'completed'
  started_at: string
  submitted_at: string | null
  completed_at: string | null
  updated_at: string
  nurses?: NurseRow | NurseRow[] | null
}

export type AnswerRow = {
  id: number
  session_id: string
  competency_id: string
  question_id: string
  answer: Rating
  answered_at: string
}

export type EvaluatorSnapshot = {
  name?: string
  job_number?: string
  job_title?: string | null
  signature_path?: string | null
  captured_at?: string
}

export type ReviewRow = {
  id: string
  session_id: string
  competency_id: string
  evaluator_comments: string | null
  staff_comments: string | null
  needs_remedial: boolean | null
  remedial_date: string | null
  finalized: boolean
  finalized_at: string | null
  evaluator_snapshot: EvaluatorSnapshot | null
}

export type EvaluatorProfile = {
  id?: string
  user_id: string
  name: string
  job_number: string
  job_title: string | null
  signature_path: string | null
  updated_at?: string
}

export type Score = {
  counts: Record<Rating, number>
  answered: number
  total: number
  /** M count — the form's "Raw Score" */
  raw: number
  /** M + NM — NA entries are deducted from the total score */
  totalApplicable: number
  percent: number | null
  result: 'Met' | 'Not Met' | 'Complete' | 'Incomplete'
}
