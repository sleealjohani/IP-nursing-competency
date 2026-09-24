export type Rating = 'M' | 'NM' | 'NA'

export type Competency = {
  id: string
  code: string
  title: string
  sort_order: number
  template_file: string
  page_count: number
  question_count: number
  competency_type: string
  is_active: boolean
}

export type CompetencySection = {
  id: string
  competency_id: string
  section_key: 'knowledge' | 'skills' | 'attitude'
  numeral: string
  title: string
  sort_order: number
}

export type CompetencyQuestion = {
  id: string
  competency_id: string
  section_id: string
  number: number
  text: string
  sort_order: number
  needs_source_review: boolean
}

export type NurseIdentity = {
  name: string
  job_number: string
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
  evaluator_snapshot: Record<string, unknown> | null
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
  m: number
  nm: number
  na: number
  answered: number
  totalApplicable: number
  percent: number | null
  result: 'Met' | 'Not Met' | 'Incomplete'
}
