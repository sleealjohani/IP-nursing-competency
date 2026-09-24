import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { GlassCard } from '../../components/Ui'
import type { ClinicalContent } from '../../lib/content'
import type { Competency, CompetencyQuestion, Rating } from '../../lib/types'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'

type Props={lang:Lang;content:ClinicalContent;competency:Competency;questions:CompetencyQuestion[];position:number;answers:Record<string,Rating>;saveState:string;onChoose:(r:Rating)=>void;onPosition:(n:number)=>void;onBack:()=>void}
export function QuestionView(p:Props){const t=copy[p.lang],rtl=p.lang==='ar',q=p.questions[p.position];if(!q)return null;const sec=p.content.sections.find(s=>s.id===q.section_id);const selected=p.answers[q.id];const total=p.content.questions.length;const ai=p.content.questions.findIndex(x=>x.id===q.id)+1
return <div className="question-wrap">
  <div className="question-meta"><span>{p.competency.code} · <b dir="ltr">{p.competency.title}</b></span><span dir="ltr">{ai}/{total}</span></div>
  <div key={q.id} className="question-swap"><GlassCard className="question-card">
    <div className="question-top"><div><span className="section-chip">{sec?.numeral} · {rtl?t[sec?.section_key||'knowledge']:sec?.title}</span><small>{rtl?'السؤال':'Question'} {p.position+1}/{p.questions.length}</small></div><span className={`save-state ${p.saveState==='saved'?'ok':''}`}>{p.saveState==='saving'?<><Save size={14}/>{t.saving}</>:p.saveState==='saved'?<><Check size={14}/>{t.saved}</>:p.saveState==='error'?(rtl?'تعذر الحفظ':'Save failed'):''}</span></div>
    <div className="question-text" dir="ltr">{q.text}</div>{q.needs_source_review&&<div className="source-warning">⚠ NEEDS SOURCE REVIEW</div>}
    <div className="rating-grid">{(['M','NM','NA'] as Rating[]).map(r=><button key={r} aria-pressed={selected===r} className={selected===r?`selected ${r.toLowerCase()}`:''} onClick={()=>p.onChoose(r)}>{selected===r&&<span className="hand-check">✓</span>}<strong>{r}</strong><small>{r==='M'?'Met':r==='NM'?'Not Met':'Not Applicable'}</small></button>)}</div>
  </GlassCard></div>
  <div className="question-nav"><button disabled={!p.position} onClick={()=>p.onPosition(p.position-1)}>{rtl?<ChevronRight size={17}/>:<ChevronLeft size={17}/>} {t.previous}</button><button onClick={p.onBack}>{rtl?'قائمة الكفاءات':'Competencies'}</button><button disabled={p.position>=p.questions.length-1} onClick={()=>p.onPosition(p.position+1)}>{t.next} {rtl?<ChevronLeft size={17}/>:<ChevronRight size={17}/>}</button></div>
</div>}
