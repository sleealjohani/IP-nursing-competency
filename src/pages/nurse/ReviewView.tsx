import { BadgeCheck, ClipboardCheck } from 'lucide-react'
import { GlassCard, Metric } from '../../components/Ui'
import { Orbit } from '../../components/Orbit'
import { CATEGORY_LABEL, forms, formTitle, questions } from '../../lib/content'
import type { Rating } from '../../lib/types'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'
import { percentLabel, scoreForm } from '../../lib/scoring'

type Props={lang:Lang;answers:Record<string,Rating>;busy:boolean;onBack:()=>void;onOpen:(position:number)=>void;onSubmit:()=>void}

export function ReviewView(p:Props){
  const t=copy[p.lang],rtl=p.lang==='ar'
  const missing=questions.filter(q=>!p.answers[q.id])
  const answered=questions.length-missing.length
  const doneForms=forms.filter(f=>scoreForm(f,p.answers).result!=='Incomplete').length
  let lastCategory=''
  return <div className="question-wrap"><GlassCard>
    <div className="review-hero"><Orbit total={forms.length} done={doneForms} size={150} label={rtl?`أنجزت ${doneForms} من ${forms.length} نموذجًا`:`${doneForms} of ${forms.length} forms complete`}/><div>
    <div className="eyebrow"><ClipboardCheck size={15}/>{t.reviewTitle}</div>
    <h1>{rtl?'راجع نماذجك قبل الإرسال':'Review your forms before submitting'}</h1></div></div>
    <div className="metrics"><Metric value={`${answered}/${questions.length}`} label={t.progress}/><Metric value={`${doneForms}/${forms.length}`} label={rtl?'نماذج مكتملة':'Forms complete'}/><Metric value={Object.values(p.answers).filter(x=>x==='M').length} label={rtl?'M — مستوفى':'M — Met'}/><Metric value={Object.values(p.answers).filter(x=>x==='NM').length} label={rtl?'NM — غير مستوفى':'NM — Not Met'}/></div>
    <div className={`notice ${missing.length?'warning':'success'}`}>{missing.length?`${t.unanswered}: ${missing.length}`:(rtl?'تمت الإجابة عن جميع العبارات في جميع النماذج. يمكنك الإرسال الآن.':'Every statement in every form has an answer. You can submit now.')}</div>
    <div className="review-list">{forms.map((f,i)=>{
      const s=scoreForm(f,p.answers)
      const first=questions.find(q=>q.form.id===f.id&&!p.answers[q.id])||questions.find(q=>q.form.id===f.id)!
      const cat=CATEGORY_LABEL[f.category]
      const head=f.category!==lastCategory?<div className="review-group" key={`g-${f.category}`}>{rtl?cat?.ar:cat?.en}</div>:null
      lastCategory=f.category
      return [head,<button key={f.id} className={s.result==='Incomplete'?'missing':''} onClick={()=>p.onOpen(first.index)}><span>{i+1}</span><span><b dir={rtl&&f.title_ar?'rtl':'ltr'}>{formTitle(f,rtl)}</b><small>{s.answered}/{s.total}</small></span><strong dir="ltr">{s.result==='Incomplete'?'—':f.scale==='equipment'?'✓':percentLabel(s.percent)}</strong></button>]
    })}</div>
    <div className="question-nav"><button onClick={p.onBack}>{t.back}</button><button className="primary" disabled={!!missing.length||p.busy} onClick={p.onSubmit}><BadgeCheck size={16}/>{p.busy?'…':t.submit}</button></div>
  </GlassCard></div>
}
