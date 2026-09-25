import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Copy, Languages, Save } from 'lucide-react'
import { GlassCard } from '../../components/Ui'
import { Orbit } from '../../components/Orbit'
import { CATEGORY_LABEL, RATING_LABEL, RATING_LABEL_AR, SCALE_OPTIONS, forms, formTitle, itemText, questions } from '../../lib/content'
import type { Question } from '../../lib/content'
import { scoreForm } from '../../lib/scoring'
import type { Rating } from '../../lib/types'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'

type Props={lang:Lang;position:number;answers:Record<string,Rating>;saveState:string;name?:string;resumeCode?:string;copied:boolean;onCopy:()=>void;onLeave:()=>void;onChoose:(r:Rating)=>void;onPosition:(n:number)=>void;onReview:()=>void}

const SECTION_AR:Record<string,string>={knowledge:'المعرفة',skills:'المهارات',attitude:'السلوك',equipment:'المعدات'}

export function QuestionView(p:Props){
  const t=copy[p.lang],rtl=p.lang==='ar'
  const q:Question|undefined=questions[p.position]
  const options=q?SCALE_OPTIONS[q.form.scale]:[]
  const [showOriginal,setShowOriginal]=useState(false)

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
  const formsDone=forms.filter(f=>scoreForm(f,p.answers).result!=='Incomplete').length
  const cat=CATEGORY_LABEL[q.form.category]
  const allDone=answered===questions.length
  const text=itemText(q,rtl)
  const translated=text!==q.text
  const size=text.length>420?'long':text.length>200?'medium':''

  return <div className="question-wrap">
    <GlassCard className="session-strip"><div><strong>{p.name}</strong></div><div className="row"><button className="code-pill" onClick={p.onCopy} title={t.saveCode}><Copy size={14}/>{p.copied?'✓':p.resumeCode}</button><button onClick={p.onLeave}>{rtl?'خروج آمن':'Leave safely'}</button></div></GlassCard>

    <div className="journey">
      <div className="progress-line"><span>{answered} / {questions.length} {rtl?'عبارة':'statements'}</span><strong>{pct}%</strong></div>
      <div className="progress-track"><i style={{width:`${pct}%`}}/></div>
    </div>

    <div key={q.form.id} className="form-banner">
      <Orbit total={forms.length} done={formsDone} current={q.formIndex} size={64} showCount={false} label={rtl?`النموذج ${q.formIndex+1} من ${forms.length}`:`Form ${q.formIndex+1} of ${forms.length}`}/>
      <div>
        <small>{t.form} {q.formIndex+1} {t.of} {forms.length} · {rtl?cat?.ar:cat?.en}</small>
        <b dir={rtl&&q.form.title_ar?'rtl':'ltr'}>{formTitle(q.form,rtl)}</b>
        {rtl&&q.form.title_ar&&<span className="form-title-en" dir="ltr">{q.form.title}</span>}
      </div>
      <span className="form-banner-count" dir="ltr">{formDone}/{q.formTotal}</span>
    </div>

    <div key={q.id} className="question-swap"><GlassCard className="question-card">
      <div className="question-top"><div><span className="section-chip">{q.section.numeral} {rtl?SECTION_AR[q.section.key]:q.section.title}</span><small>{t.statement} {q.position+1} {t.of} {q.formTotal}</small></div><span className={`save-state ${p.saveState==='saved'?'ok':''} ${p.saveState==='error'?'err':''}`}>{p.saveState==='saving'?<><Save size={14}/>{t.saving}</>:p.saveState==='saved'?<><Check size={14}/>{t.saved}</>:p.saveState==='error'?t.notSaved:''}</span></div>
      <div className={`question-text ${size}`} dir={translated?'rtl':'ltr'} lang={translated?'ar':'en'}><span className="question-label" dir="ltr">{q.label}</span>{text.split('\n').map((line,i)=><span key={i} className={i?'question-line':''}>{line}</span>)}</div>
      {translated&&<>
        <button className="original-toggle" onClick={()=>setShowOriginal(v=>!v)} aria-expanded={showOriginal}><Languages size={14}/>{showOriginal?t.hideOriginal:t.showOriginal}</button>
        {showOriginal&&<div className="original-text" dir="ltr" lang="en">{q.text.split('\n').map((line,i)=><span key={i}>{line}</span>)}</div>}
      </>}
    </GlassCard></div>

    <div className="answer-dock">
      <div className="rating-grid">{options.map((r,i)=><button key={r} aria-pressed={selected===r} className={selected===r?`selected ${r.toLowerCase()}`:''} onClick={()=>p.onChoose(r)}>{selected===r&&<span className="hand-check">✓</span>}<strong dir="ltr">{r}</strong><small>{rtl?RATING_LABEL_AR[r]:RATING_LABEL[r]}</small><kbd>{i+1}</kbd></button>)}</div>
    <div className="question-nav">
      <button disabled={!p.position} onClick={()=>p.onPosition(p.position-1)}>{rtl?<ChevronRight size={17}/>:<ChevronLeft size={17}/>} {t.previous}</button>
      <button className={allDone?'primary':''} onClick={p.onReview}><ClipboardCheck size={16}/>{t.reviewSubmit}</button>
      <button disabled={p.position>=questions.length-1||!selected} onClick={()=>p.onPosition(p.position+1)}>{t.next} {rtl?<ChevronLeft size={17}/>:<ChevronRight size={17}/>}</button>
    </div>
    </div>
  </div>
}
