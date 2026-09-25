import fontkit from '@pdf-lib/fontkit'
import { LineCapStyle, PDFDocument, PDFName, PDFRef, degrees, rgb } from 'pdf-lib'
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib'
import { formatDate } from './dates'
import { scoreForm } from './scoring'
import type { CompetencyForm, EvaluatorSnapshot, NurseIdentity, Rating, ReviewRow } from './types'

/**
 * Fills the original competency PDF templates (public/forms) so they look hand-written:
 * blue-ink handwriting for every value and a hand-drawn tick for every check box.
 * The template itself is kept untouched and vector, so the output prints sharp at any size.
 */

export type FillInput = {
  form: CompetencyForm
  nurse: NurseIdentity
  answers: Record<string, Rating | undefined>
  review?: ReviewRow | null
  evaluator?: EvaluatorSnapshot | null
  evaluatorSignature?: Uint8Array | null
  /** date the nurse submitted (used for "Conformed By … Date") */
  confirmedAt?: string | null
}

const INK = rgb(0.075, 0.19, 0.52)
const HAND_LATIN = '/fonts/Caveat-Hand.ttf'
const HAND_ARABIC = '/fonts/ArefRuqaa-Regular.ttf'
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/

const cache = new Map<string, Promise<ArrayBuffer>>()
function asset(url: string) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`)
      return r.arrayBuffer()
    }))
  }
  return cache.get(url)!
}

let arabicFontReady: Promise<void> | null = null
function loadArabicFont() {
  arabicFontReady ??= new FontFace('HandArabic', `url(${HAND_ARABIC})`).load().then(face => { document.fonts.add(face) })
  return arabicFontReady
}

/** Small deterministic jitter so a re-print looks identical, yet no two marks are the same. */
function jitter(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return (n: number) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ n
    return ((h >>> 0) % 10000) / 10000 - 0.5
  }
}


type Box = { x: number; y: number; width: number; height: number }
type Widget = { page: PDFPage; rect: Box }

function locateWidgets(doc: PDFDocument) {
  const pages = doc.getPages()
  const byRef = new Map<string, PDFPage>()
  pages.forEach(page => {
    const annots = page.node.Annots()
    for (let i = 0; i < (annots?.size() ?? 0); i++) {
      const ref = annots!.get(i)
      if (ref instanceof PDFRef) byRef.set(ref.toString(), page)
    }
  })
  const widgets = new Map<string, Widget>()
  const form = doc.getForm()
  for (const field of form.getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const ref = doc.context.getObjectRef(widget.dict)
      const pageRef = widget.P()
      const page = (ref && byRef.get(ref.toString()))
        || pages.find(p => pageRef && p.ref.toString() === pageRef.toString())
      if (page) widgets.set(field.getName(), { page, rect: widget.getRectangle() })
    }
  }
  return widgets
}

async function arabicImage(doc: PDFDocument, text: string, sizePt: number) {
  await loadArabicFont()
  const scale = 8 // 8 px per pt ≈ 576 dpi
  const px = sizePt * scale
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = `${px}px HandArabic`
  const width = Math.ceil(measure.measureText(text).width + px * 0.4)
  const height = Math.ceil(px * 1.7)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.font = `${px}px HandArabic`
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgb(19, 48, 133)'
  ctx.fillText(text, width - px * 0.2, px * 1.15)
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
  const image = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()))
  return { image, width: width / scale, height: height / scale, baseline: (px * 1.15) / scale }
}

class Pen {
  constructor(private doc: PDFDocument, private font: PDFFont) {}

  async write(target: Widget, text: string, opts: { size?: number; align?: 'left' | 'center'; seed?: string } = {}) {
    if (!text) return
    const { page, rect } = target
    const rand = jitter(opts.seed ?? text)
    let size = opts.size ?? Math.min(rect.height * 1.3, 14.5)
    if (ARABIC.test(text)) {
      const img = await arabicImage(this.doc, text, size * 0.9)
      const fit = Math.min(1, (rect.width - 2) / img.width)
      const w = img.width * fit, h = img.height * fit
      const x = opts.align === 'center' ? rect.x + (rect.width - w) / 2 : rect.x + 2
      const baseline = rect.y + 1.6 + rand(1) * 0.8
      page.drawImage(img.image, { x, y: baseline - (img.height - img.baseline) * fit, width: w, height: h })
      return
    }
    while (size > 6 && this.font.widthOfTextAtSize(text, size) > rect.width - 3) size -= 0.25
    const width = this.font.widthOfTextAtSize(text, size)
    const x = (opts.align === 'center' ? rect.x + (rect.width - width) / 2 : rect.x + 2) + rand(2) * 1.2
    const y = rect.y + 1.8 + rand(3) * 0.9
    page.drawText(text, { x, y, size, font: this.font, color: INK, rotate: degrees(rand(4) * 2.2) })
  }

  tick(target: Widget, seed: string) {
    const { page, rect } = target
    const rand = jitter(seed)
    const paths = [
      'M1.5 11.5 C3.5 12.8 5.6 14.9 7.2 18 C9.6 11.6 13.6 5.8 19.5 1.2',
      'M1 10.2 C3.2 11.9 5.2 14.2 6.6 17.4 C8.8 12.1 12.9 6.4 18.8 2.1',
      'M2 12.4 C4 13.4 5.8 15.4 7.6 18.3 C10.4 12.4 14.2 6.8 19.8 2.6',
    ]
    const d = paths[Math.abs(Math.round(rand(1) * 10)) % paths.length]
    const s = ((rect.width + 5) / 20) * (1 + rand(2) * 0.12)
    page.drawSvgPath(d, {
      x: rect.x - 1.5 + rand(3) * 1.5,
      y: rect.y + rect.height + 4 + rand(4) * 1.2,
      scale: s,
      rotate: degrees(rand(5) * 8),
      borderColor: INK,
      borderWidth: 1.35 / s,
      borderLineCap: LineCapStyle.Round,
    })
  }

  image(target: Widget, image: PDFImage) {
    const { page, rect } = target
    const h = 24
    const w = Math.min(78, (image.width / image.height) * h)
    page.drawImage(image, { x: rect.x + rect.width - w, y: rect.y - 3, width: w, height: h })
  }
}

/** Split free text over the three comment lines printed on the form. */
function commentLines(font: PDFFont, text: string, width: number, size: number, count = 3) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (lines.length < count - 1 && line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function fillForm(input: FillInput): Promise<PDFDocument> {
  const { form, nurse, answers, review, evaluator } = input
  const [templateBytes, fontBytes] = await Promise.all([asset(`/forms/${form.file}`), asset(HAND_LATIN)])
  const doc = await PDFDocument.load(templateBytes)
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(fontBytes, { features: { calt: false, liga: false, clig: false, dlig: false } })
  const pen = new Pen(doc, font)
  const widgets = locateWidgets(doc)
  const at = (name: string) => widgets.get(name)

  const write = async (name: string, text: string | null | undefined, opts?: Parameters<Pen['write']>[2]) => {
    const w = at(name)
    if (w && text) await pen.write(w, text, { seed: `${form.id}:${name}`, ...opts })
  }
  const tick = (name: string) => {
    const w = at(name)
    if (w) pen.tick(w, `${form.id}:${name}`)
  }

  // Remedial YES / NO boxes only exist as form widgets on some templates: draw the empty boxes first.
  for (const name of ['needs_remedial_yes', 'needs_remedial_no']) {
    const w = at(name)
    if (w) w.page.drawRectangle({ ...w.rect, borderColor: rgb(0.1, 0.1, 0.1), borderWidth: 0.6 })
  }

  // Header
  await write('staff_name', nurse.name)
  await write('job_number', nurse.job_number)
  await write('unit', nurse.unit)
  await write('job_title', nurse.job_title)
  await write('contract_date', formatDate(nurse.contract_date))

  // Statements
  for (const section of form.sections) {
    for (const item of section.items) {
      const answer = answers[item.id]
      if (answer) tick(`${item.field}_${answer.toLowerCase()}`)
    }
  }

  // Scores
  const score = scoreForm(form, answers)
  const complete = score.answered === score.total
  if (form.scale === 'mnmna' && complete) {
    await write('rawscore_m', String(score.counts.M), { align: 'center' })
    await write('rawscore_nm', String(score.counts.NM), { align: 'center' })
    await write('rawscore_na', String(score.counts.NA), { align: 'center' })
    if (score.percent !== null) {
      const pct = score.percent.toFixed(score.percent % 1 === 0 ? 0 : 1)
      await write('percent_rating', pct, { align: 'center' })
      await write('rating', `${pct}%`)
    }
  }

  // Remedial: the evaluator's decision when recorded, otherwise the rating scale (< 90% = remedial)
  const remedial = review?.needs_remedial ?? (complete && score.percent !== null ? score.percent < 90 : null)
  if (remedial !== null) tick(remedial ? 'needs_remedial_yes' : 'needs_remedial_no')
  await write('remedial_date', formatDate(review?.remedial_date))

  // Comments
  for (const [prefix, text] of [['evaluator_comment', review?.evaluator_comments], ['staff_comment', review?.staff_comments]] as const) {
    const first = at(`${prefix}_1`)
    if (!first || !text) continue
    const lines = commentLines(font, text, first.rect.width - 4, 11)
    for (let i = 0; i < lines.length; i++) await write(`${prefix}_${i + 1}`, lines[i])
  }

  // Signatures
  if (evaluator?.name) {
    await write('evaluated_by', [evaluator.name, evaluator.job_number].filter(Boolean).join(' / '), { size: 12 })
    const sig = at('evaluated_by')
    if (sig && input.evaluatorSignature) pen.image(sig, await doc.embedPng(input.evaluatorSignature))
  }
  await write('staff_signature', nurse.name, { size: 12.5 })
  await write('staff_sign_date', formatDate(input.confirmedAt))

  // Drop the interactive fields (and their blue shading): the page keeps only the ink.
  const acro = doc.getForm()
  for (const field of acro.getFields()) acro.removeField(field)
  doc.catalog.delete(PDFName.of('AcroForm'))

  doc.setTitle(`${form.title} — ${nurse.name}`)
  doc.setAuthor('Al Hadeethah General Hospital — Nursing Service Department')
  doc.setSubject(`${form.category} · ${nurse.name} (${nurse.job_number})`)
  doc.setProducer('Nursing Competency')
  doc.setCreator('Nursing Competency')
  return doc
}

export async function formPdf(input: FillInput) {
  return (await fillForm(input)).save({ updateFieldAppearances: false })
}

/** One PDF with every form of a nurse, in questionnaire order. */
export async function bundlePdf(inputs: FillInput[], title: string, onProgress?: (done: number, total: number) => void) {
  const out = await PDFDocument.create()
  out.setTitle(title)
  out.setAuthor('Al Hadeethah General Hospital — Nursing Service Department')
  let done = 0
  for (const input of inputs) {
    const doc = await fillForm(input)
    const pages = await out.copyPages(doc, doc.getPageIndices())
    pages.forEach(page => out.addPage(page))
    onProgress?.(++done, inputs.length)
  }
  return out.save({ updateFieldAppearances: false })
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.replace(/[\\/:*?"<>|]+/g, '-')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function openPdf(bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000)
}
