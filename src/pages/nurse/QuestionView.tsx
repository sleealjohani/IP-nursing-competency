import { useEffect } from 'react'
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Copy, FileText, Save } from 'lucide-react'
import { GlassCard } from '../../components/Ui'
import { CATEGORY_LABEL, RATING_LABEL, SCALE_OPTIONS, questions } from '../../lib/content'
import type { Question } from '../../lib/content'
import type { Rating } from '../../lib/types'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'

type Props={lang:Lang;position:number;answers:Record<string,Rating>;saveState:string;name?:string;resumeCode?:string;copied:boolean;onCopy:()=>void;onLeave:()=>void;onChoose:(r:Rating)=>void;onPosition:(n:number)=>void;onReview:()=>void}

const SECTION_AR:Record<string,string>={knowledge:'المعرفة',skills:'المهارات',attitude:'السلوك',equipment:'المعدات'}

export function QuestionView(p:Props){
  const t=copy[p.lang],rtl=p.lang==='ar'
  const q:Question|undefined=questions[p.position]
  const options=q?SCALE_OPTIONS[q.form.scale]:[]

  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return
      const n=Number(e.key)
      if(n>=1&&n<=options.length){e.preventDefault();p.onChoose(options[n-1])}
      if(e.key==='ArrowRight')p.onPosition(Math.max(0,Math.min(questions.length-1,p.position+(rtl?-1:1))))
      if(e.key==='ArrowLeft')p.onPosition(Math.max(0,Math.min(questions.length-1,p.position+(rtl?1:-1))))
    }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  })

  if(!q)return null
  const selected=p.answers[q.id]
  const answered=questions.filter(x=>p.answers[x.id]).length
  const pct=Math.round(answered/questions.length*100)
  const formDone=questions.filter(x=>x.form.id===q.form.id&&p.answers[x.id]).length
  const cat=CATEGORY_LABEL[q.form.category]
  const allDone=answered===questions.length

  return <div className="question-wrap">
    <GlassCard className="session-strip"><div><strong>{p.name}</strong></div><div className="row"><button className="code-pill" onClick={p.onCopy} title={t.saveCode}><Copy size={14}/>{p.copied?'✓':p.resumeCode}</button><button onClick={p.onLeave}>{rtl?'خروج آمن':'Leave safely'}</button></div></GlassCard>

    <div className="journey">
      <div className="progress-line"><span>{answered} / {questions.length} {rtl?'عبارة':'statements'}</span><strong>{pct}%</strong></div>
      <div className="progress-track"><i style={{width:`${pct}%`}}/></div>
    </div>

    <div key={q.form.id} className="form-banner">
      <span className="form-banner-icon"><FileText size={20}/></span>
      <div>
        <small>{t.form} {q.formIndex+1} {t.of} {new Set(questions.map(x=>x.form.id)).size} · {rtl?cat?.ar:cat?.en}</small>
        <b dir="ltr">{q.form.title}</b>
      </div>
      <span className="form-banner-count" dir="ltr">{formDone}/{q.formTotal}</span>
    </div>

    <div key={q.id} className="question-swap"><GlassCard className="question-card">
      <div className="question-top"><div><span className="section-chip">{q.section.numeral} {rtl?SECTION_AR[q.section.key]:q.section.title}</span><small>{t.statement} {q.position+1} {t.of} {q.formTotal}</small></div><span className={`save-state ${p.saveState==='saved'?'ok':''} ${p.saveState==='error'?'err':''}`}>{p.saveState==='saving'?<><Save size={14}/>{t.saving}</>:p.saveState==='saved'?<><Check size={14}/>{t.saved}</>:p.saveState==='error'?t.notSaved:''}</span></div>
      <div className={`question-text ${q.text.length>420?'long':q.text.length>200?'medium':''}`} dir="ltr"><span className="question-label">{q.label}</span>{q.text.split('\n').map((line,i)=><span key={i} className={i?'question-line':''}>{line}</span>)}</div>
      <div className="rating-grid">{options.map((r,i)=><button key={r} aria-pressed={selected===r} className={selected===r?`selected ${r.toLowerCase()}`:''} onClick={()=>p.onChoose(r)}>{selected===r&&<span className="hand-check">✓</span>}<strong>{r}</strong><small dir="ltr">{RATING_LABEL[r]}</small><kbd>{i+1}</kbd></button>)}</div>
    </GlassCard></div>

    <div className="question-nav">
      <button disabled={!p.position} onClick={()=>p.onPosition(p.position-1)}>{rtl?<ChevronRight size={17}/>:<ChevronLeft size={17}/>} {t.previous}</button>
      <button className={allDone?'primary':''} onClick={p.onReview}><ClipboardCheck size={16}/>{t.reviewSubmit}</button>
      <button disabled={p.position>=questions.length-1||!selected} onClick={()=>p.onPosition(p.position+1)}>{t.next} {rtl?<ChevronLeft size={17}/>:<ChevronRight size={17}/>}</button>
    </div>
  </div>
}
