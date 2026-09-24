import { supabase } from './supabase'
import type { Competency, CompetencyQuestion, CompetencySection } from './types'

export type ClinicalContent = {
  competencies: Competency[]
  sections: CompetencySection[]
  questions: CompetencyQuestion[]
}

let cache: ClinicalContent | null = null

export async function loadClinicalContent(): Promise<ClinicalContent> {
  if (cache) return cache

  const [competenciesResult, sectionsResult, questionsResult] = await Promise.all([
    supabase.from('competencies').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('competency_sections').select('*').order('sort_order'),
    supabase.from('competency_questions').select('*').order('sort_order'),
  ])

  if (competenciesResult.error) throw competenciesResult.error
  if (sectionsResult.error) throw sectionsResult.error
  if (questionsResult.error) throw questionsResult.error

  cache = {
    competencies: (competenciesResult.data || []) as Competency[],
    sections: (sectionsResult.data || []) as CompetencySection[],
    questions: (questionsResult.data || []) as CompetencyQuestion[],
  }
  return cache
}
