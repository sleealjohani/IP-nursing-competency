import { KeyRound, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { GlassCard } from '../../components/Ui'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'
import type { NurseStartInput } from '../../lib/types'

type Props = {
  lang: Lang
  busy: boolean
  message: {type:string;text:string}|null
  counts: { forms:number; questions:number }
  onStart: (input:NurseStartInput)=>void
  onResume: (jobNumber:string, code:string)=>void
}

export function EntryPanel({ lang, busy, message, counts, onStart, onResume }: Props) {
  const rtl = lang === 'ar'; const t = copy[lang]
  return <div className="hero-grid">
    <img className="flow-pattern" src="/brand/pattern-flow-of-care.png" alt="" aria-hidden="true"/>
    <div className="hero-copy">
      <img className="hero-mark" src="/brand/hh-star.svg" alt=""/>
      <div className="eyebrow"><Sparkles size={15}/>{t.nursePortal}</div>
      <h1>{rtl ? <>كفاءات<span>التمريض</span></> : <>Nursing<span>competency</span></>}</h1>
      <p>{rtl ? `${counts.forms} نموذجًا، ${counts.questions} عبارة. أدخل بياناتك مرة واحدة، ثم أجب عن كل عبارة بخيار واحد. ينتقل النظام تلقائيًا من نموذج إلى آخر ويحفظ كل إجابة فورًا، وعند الانتهاء يُرسل كل نموذج باسمك إلى الإدارة.` : `${counts.forms} forms, ${counts.questions} statements. Enter your details once, then answer each statement with one option. You move from form to form automatically, every answer is saved instantly, and when you finish each form is sent to the administration under your name.`}</p>
      <div className="chips"><span><ShieldCheck size={14}/>{counts.forms} {rtl?'نموذج كفاءة':'competency forms'}</span><span>{counts.questions} {rtl?'عبارة تقييم':'statements'}</span></div>
    </div>
    <GlassCard className="entry-card">
      {message && <div className={`notice ${message.type}`}>{message.text}</div>}
      <details open>
        <summary><Play size={15}/>{t.begin}</summary>
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);onStart({name:String(f.get('name')||''),job_number:String(f.get('job')||''),unit:String(f.get('unit')||''),job_title:String(f.get('title')||'')})}}>
          <label>{t.name}<input name="name" required maxLength={120} autoComplete="name"/></label>
          <div className="form-pair">
            <label>{t.jobNumber}<input name="job" required maxLength={30} dir="ltr" autoComplete="off" pattern="[A-Za-z0-9\-]{1,30}"/></label>
            <label>{t.unit}<input name="unit" required maxLength={80}/></label>
          </div>
          <label>{t.jobTitle}<input name="title" required maxLength={80}/></label>
          <button className="primary" disabled={busy}><Play size={16}/>{busy?'…':t.start}</button>
        </form>
      </details>
      <div className="divider"><span>{rtl?'أو':'or'}</span></div>
      <details>
        <summary><KeyRound size={15}/>{t.resume}</summary>
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);onResume(String(f.get('job')||''),String(f.get('code')||''))}}>
          <label>{t.jobNumber}<input name="job" required maxLength={30} dir="ltr"/></label>
          <label>{t.resumeCode}<input name="code" required maxLength={12} dir="ltr" className="code-input"/></label>
          <button className="primary" disabled={busy}><KeyRound size={16}/>{busy?'…':t.continue}</button>
        </form>
      </details>
    </GlassCard>
  </div>
}
