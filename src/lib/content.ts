import catalog from '../data/catalog.json'
import type { CompetencyForm, FormItem, FormSection, Rating, Scale } from './types'

/** All competency forms, in questionnaire order. Generated from the PDF templates by scripts/forms/build_catalog.py. */
export const forms = (catalog as { forms: CompetencyForm[] }).forms

export type Question = FormItem & {
  form: CompetencyForm
  section: FormSection
  /** position in the whole questionnaire */
  index: number
  formIndex: number
  /** position inside its own form */
  position: number
  formTotal: number
}

export const questions: Question[] = []
forms.forEach((form, formIndex) => {
  const items = form.sections.flatMap(section => section.items.map(item => ({ item, section })))
  items.forEach(({ item, section }, position) => {
    questions.push({ ...item, form, section, index: questions.length, formIndex, position, formTotal: items.length })
  })
})

export const formQuestions = (form: CompetencyForm) => questions.filter(q => q.form.id === form.id)

export const SCALE_OPTIONS: Record<Scale, Rating[]> = {
  mnmna: ['M', 'NM', 'NA'],
  equipment: ['VT', 'RD', 'UEC'],
}

export const RATING_LABEL: Record<Rating, string> = {
  M: 'Met',
  NM: 'Not Met',
  NA: 'Not Applicable',
  VT: 'Training given to staff by the vendor',
  RD: 'Repeats a demonstration with little supervision',
  UEC: 'Uses the equipment independently',
}

export const RATING_LABEL_AR: Record<Rating, string> = {
  M: 'مستوفى',
  NM: 'غير مستوفى',
  NA: 'لا ينطبق',
  VT: 'تدريب من المورّد',
  RD: 'يعيد العرض بإشراف بسيط',
  UEC: 'يستخدم الجهاز باستقلالية',
}

/** Arabic on the Arabic website; the original English everywhere else (and always on the PDF). */
export const formTitle = (form: CompetencyForm, rtl: boolean) => (rtl && form.title_ar) || form.title
export const itemText = (item: FormItem, rtl: boolean) => (rtl && item.text_ar) || item.text

export const CATEGORY_LABEL: Record<string, { ar: string; en: string }> = {
  'MANDATORY COMPETENCY': { ar: 'كفاءة إلزامية', en: 'Mandatory competency' },
  'GENERAL COMPETENCY': { ar: 'كفاءة عامة', en: 'General competency' },
  'SPECIFIC COMPETENCY': { ar: 'كفاءة تخصصية — قسم الإقامة الطويلة', en: 'Specific competency — Long stay' },
}
