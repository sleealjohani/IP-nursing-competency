import { ArrowLeft, ArrowRight, ClipboardCheck, Copy, HeartPulse } from 'lucide-react'
import { GlassCard, StatusBadge } from '../../components/Ui'
import type { ClinicalContent } from '../../lib/content'
import type { Competency, Rating } from '../../lib/types'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'
import { scoreQuestions } from '../../lib/scoring'

type Props={lang:Lang;content:ClinicalContent;answers:Record<string,Rating>;name?:string;job?:string;resumeCode?:string;copied:boolean;onCopy:()=>void;onLeave:()=>void;onOpen:(c:Competency)=>void;onReview:()=>void}
export function Workspace(p:Props){const t=copy[p.lang],rtl=p.lang==='ar';const total=p.content.questions.length;const answered=p.content.questions.filter(q=>p.answers[q.id]).length;const pct=total?Math.round(answered/total*100):0
return <>
  <GlassCard className="session-strip"><div><strong>{p.name}</strong><small dir="ltr">{p.job}</small></div><div className="row"><button className="code-pill" onClick={p.onCopy}><Copy size={14}/>{p.copied?'✓':p.resumeCode}</button><button onClick={p.onLeave}>{rtl?'خروج آمن':'Leave safely'}</button></div></GlassCard>
  <div className="workspace-head"><div><div className="eyebrow"><HeartPulse size={15}/>{t.nursePortal}</div><h1>{rtl?'مسار الكفاءات السريرية':'Clinical competency pathway'}</h1><p>{rtl?'يمكنك إكمال الكفاءات بأي ترتيب، وكل اختيار يُحفظ فورًا.':'Complete competencies in any order. Every response is saved immediately.'}</p></div><GlassCard className="progress-card"><div className="progress-line"><span>{t.progress}</span><strong>{pct}%</strong></div><div className="progress-track"><i style={{width:`${pct}%`}}/></div><button className="primary" onClick={p.onReview}><ClipboardCheck size={16}/>{t.review}</button></GlassCard></div>
  <div className="competency-grid">{p.content.competencies.map(c=>{const qs=p.content.questions.filter(q=>q.competency_id===c.id);const s=scoreQuestions(qs,p.answers);const cp=Math.round(s.answered/qs.length*100);return <GlassCard key={c.id} className="competency-card"><span className="big-number">{String(c.sort_order).padStart(2,'0')}</span><HeartPulse className="card-icon" size={20}/><h3 dir="ltr">{c.title}</h3><div className="chips"><span>{t.knowledge}</span><span>{t.skills}</span><span>{t.attitude}</span></div><div className="progress-line"><span>{s.answered}/{qs.length}</span><span>{cp}%</span></div><div className="progress-track"><i style={{width:`${cp}%`}}/></div><div className="card-foot"><StatusBadge status={s.answered===qs.length?t.completed:s.answered?t.inProgress:(rtl?'لم يبدأ':'Not started')}/><button onClick={()=>p.onOpen(c)}>{s.answered?t.continue:t.start}{rtl?<ArrowLeft size={15}/>:<ArrowRight size={15}/>}</button></div></GlassCard>})}</div>
</>}
