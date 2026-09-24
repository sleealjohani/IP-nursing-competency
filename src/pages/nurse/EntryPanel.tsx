import { KeyRound, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { GlassCard } from '../../components/Ui'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'

type Props = {
  lang: Lang
  busy: boolean
  message: {type:string;text:string}|null
  counts: { competencies:number; questions:number }
  onStart: (name:string, jobNumber:string)=>void
  onResume: (jobNumber:string, code:string)=>void
}

export function EntryPanel({ lang, busy, message, counts, onStart, onResume }: Props) {
  const rtl = lang === 'ar'; const t = copy[lang]
  return <div className="hero-grid">
    <div className="hero-copy">
      <div className="eyebrow"><Sparkles size={15}/>{t.nursePortal}</div>
      <h1>{rtl ? 'تقييم الكفاءات التمريضية، بتجربة سريرية هادئة.' : 'Clinical nursing competency, with a calmer workflow.'}</h1>
      <p>{rtl ? 'ابدأ باسمك ورقمك الوظيفي، ثم قيّم كل عبارة باختيار M أو NM أو NA. يحفظ النظام تقدمك تلقائيًا.' : 'Start with your name and job number, then rate each statement M, NM or NA. Progress is saved automatically.'}</p>
      <div className="chips"><span><ShieldCheck size={14}/>{counts.competencies} {rtl?'كفاءات':'competencies'}</span><span>{counts.questions} {rtl?'عبارة تقييم':'assessment items'}</span></div>
    </div>
    <GlassCard className="entry-card">
      {message && <div className={`notice ${message.type}`}>{message.text}</div>}
      <details open>
        <summary><Play size={15}/>{t.begin}</summary>
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);onStart(String(f.get('name')||''),String(f.get('job')||''))}}>
          <label>{t.name}<input name="name" required maxLength={120} autoComplete="name"/></label>
          <label>{t.jobNumber}<input name="job" required maxLength={30} dir="ltr" autoComplete="off"/></label>
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
