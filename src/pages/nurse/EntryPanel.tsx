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
    <div className="hero-copy">
      <div className="eyebrow"><Sparkles size={15}/>{t.nursePortal}</div>
      <h1>{rtl ? 'نماذج الكفاءات التمريضية في استبيان واحد.' : 'Every nursing competency form, in one questionnaire.'}</h1>
      <p>{rtl ? 'أدخل بياناتك مرة واحدة كما تظهر في رأس النموذج، ثم أجب عن كل عبارة باختيار واحد من ثلاثة. ينتقل النظام تلقائيًا من نموذج لآخر ويحفظ كل إجابة فورًا، وعند الانتهاء يُرسل كل نموذج باسمك إلى الإدارة.' : 'Enter your details once, exactly as on the form header, then answer each statement with one of three options. You move from form to form automatically, every answer is saved instantly, and when you finish each form is sent to the administration under your name.'}</p>
      <div className="chips"><span><ShieldCheck size={14}/>{counts.forms} {rtl?'نموذج كفاءة':'competency forms'}</span><span>{counts.questions} {rtl?'عبارة تقييم':'statements'}</span></div>
    </div>
    <GlassCard className="entry-card">
      {message && <div className={`notice ${message.type}`}>{message.text}</div>}
      <details open>
        <summary><Play size={15}/>{t.begin}</summary>
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);onStart({name:String(f.get('name')||''),job_number:String(f.get('job')||''),unit:String(f.get('unit')||''),job_title:String(f.get('title')||''),contract_date:String(f.get('contract')||'')})}}>
          <label>{t.name}<input name="name" required maxLength={120} autoComplete="name"/></label>
          <div className="form-pair">
            <label>{t.jobNumber}<input name="job" required maxLength={30} dir="ltr" autoComplete="off" pattern="[A-Za-z0-9\-]{1,30}"/></label>
            <label>{t.unit}<input name="unit" required maxLength={80}/></label>
          </div>
          <div className="form-pair">
            <label>{t.jobTitle}<input name="title" required maxLength={80}/></label>
            <label>{t.contractDate}<input name="contract" type="date" required dir="ltr"/></label>
          </div>
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
