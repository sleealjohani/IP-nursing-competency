import { useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { GlassCard, Metric, Spinner, StatusBadge } from '../components/Ui'
import { loadClinicalContent, type ClinicalContent } from '../lib/content'
import type { Competency, NurseSessionPayload, Rating } from '../lib/types'
import type { Lang } from '../lib/i18n'
import { copy } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { EntryPanel } from './nurse/EntryPanel'
import { Workspace } from './nurse/Workspace'
import { QuestionView } from './nurse/QuestionView'
import { ReviewView } from './nurse/ReviewView'

const TOKEN_KEY='ip_nursing_session_token'
type View='entry'|'workspace'|'assessment'|'review'|'locked'

export function NursePortal({lang}:{lang:Lang}){
  const rtl=lang==='ar',t=copy[lang]
  const [content,setContent]=useState<ClinicalContent|null>(null)
  const [session,setSession]=useState<NurseSessionPayload|null>(null)
  const [token,setToken]=useState<string|null>(()=>localStorage.getItem(TOKEN_KEY))
  const [view,setView]=useState<View>(token?'workspace':'entry')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState<{type:'error'|'success'|'info';text:string}|null>(null)
  const [saveState,setSaveState]=useState('idle')
  const [active,setActive]=useState<Competency|null>(null)
  const [position,setPosition]=useState(0)
  const [copied,setCopied]=useState(false)
  const timer=useRef<number|null>(null)
  const answers=session?.answers||{}

  useEffect(()=>{loadClinicalContent().then(setContent).catch(e=>setMessage({type:'error',text:e.message}))},[])
  useEffect(()=>{if(token)void hydrate(token)},[token])
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])

  async function hydrate(current:string){setBusy(true);const {data,error}=await supabase.rpc('nurse_get',{p_token:current});setBusy(false);const p=data as NurseSessionPayload|null;if(error||!p?.ok){localStorage.removeItem(TOKEN_KEY);setToken(null);setSession(null);setView('entry');setMessage({type:'error',text:rtl?'تعذر استعادة جلسة التقييم.':'Could not restore the assessment session.'});return}setSession(p);setView(p.status==='submitted'||p.status==='completed'?'locked':'workspace')}
  async function start(name:string,job:string){setBusy(true);setMessage(null);const {data,error}=await supabase.rpc('nurse_start',{p_name:name.trim(),p_job_number:job.trim()});setBusy(false);const p=data as NurseSessionPayload|null;if(error||!p?.ok||!p.token){const m:Record<string,string>={SESSION_EXISTS:rtl?'يوجد تقييم غير مكتمل. استخدم الاستكمال.':'An unfinished assessment exists. Use Resume.',ALREADY_SUBMITTED:rtl?'تم إرسال تقييم سابق وبانتظار المراجعة.':'A prior assessment is awaiting review.',INVALID_NAME:rtl?'تحقق من الاسم.':'Check the name.',INVALID_JOB_NUMBER:rtl?'تحقق من الرقم الوظيفي.':'Check the job number.'};setMessage({type:'error',text:error?.message||m[p?.error||'']||(rtl?'تعذر بدء التقييم.':'Could not start assessment.')});return}localStorage.setItem(TOKEN_KEY,p.token);setToken(p.token)}
  async function resume(job:string,code:string){setBusy(true);setMessage(null);const {data,error}=await supabase.rpc('nurse_resume',{p_job_number:job.trim(),p_code:code.trim().toUpperCase()});setBusy(false);const p=data as NurseSessionPayload|null;if(error||!p?.ok||!p.token){const m:Record<string,string>={NOT_FOUND:rtl?'لم يتم العثور على تقييم قابل للاستكمال.':'No resumable assessment found.',INVALID_CODE:rtl?'رمز الاستكمال غير صحيح.':'Resume code is incorrect.',LOCKED:rtl?'تم قفل محاولات الاستكمال.':'Resume attempts are locked.'};setMessage({type:'error',text:error?.message||m[p?.error||'']||(rtl?'تعذر الاستكمال.':'Could not resume.')});return}localStorage.setItem(TOKEN_KEY,p.token);setToken(p.token)}
  function open(c:Competency,qid?:string){if(!content)return;const qs=content.questions.filter(q=>q.competency_id===c.id).sort((a,b)=>a.sort_order-b.sort_order);const preferred=qid?qs.findIndex(q=>q.id===qid):-1;const missing=qs.findIndex(q=>!answers[q.id]);setActive(c);setPosition(preferred>=0?preferred:missing>=0?missing:0);setView('assessment');scrollTo({top:0,behavior:'smooth'})}
  const activeQuestions=useMemo(()=>!content||!active?[]:content.questions.filter(q=>q.competency_id===active.id).sort((a,b)=>a.sort_order-b.sort_order),[content,active])
  async function choose(r:Rating){const q=activeQuestions[position];if(!q||!token)return;const next={...answers,[q.id]:r};setSession(s=>s?{...s,answers:next}:s);setSaveState('saving');const {data,error}=await supabase.rpc('nurse_save_answers',{p_token:token,p_answers:{[q.id]:r}});const p=data as NurseSessionPayload|null;if(error||p?.ok===false){setSaveState('error');return}setSaveState('saved');if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>position<activeQuestions.length-1?setPosition(x=>x+1):setView('workspace'),380)}
  async function submit(){if(!content||!token||content.questions.some(q=>!answers[q.id]))return;if(!confirm(rtl?'هل أنت متأكد من إرسال التقييم للمراجعة؟':'Submit assessment for evaluator review?'))return;setBusy(true);const {data,error}=await supabase.rpc('nurse_submit',{p_token:token});setBusy(false);const p=data as NurseSessionPayload|null;if(error||!p?.ok){setMessage({type:'error',text:error?.message||(rtl?'تعذر إرسال التقييم.':'Could not submit assessment.')});return}await hydrate(token);setMessage({type:'success',text:t.submittedForReview})}
  function leave(){localStorage.removeItem(TOKEN_KEY);setToken(null);setSession(null);setView('entry');setMessage(null)}
  async function copyCode(){if(!session?.resume_code)return;await navigator.clipboard.writeText(session.resume_code);setCopied(true);setTimeout(()=>setCopied(false),1400)}

  if(!content)return <GlassCard><Spinner label={rtl?'جارٍ تحميل محتوى الكفاءات…':'Loading competency content…'}/></GlassCard>
  if(busy&&token&&!session)return <GlassCard><Spinner label={rtl?'جارٍ استعادة التقييم…':'Restoring assessment…'}/></GlassCard>
  if(view==='entry'||!session)return <EntryPanel lang={lang} busy={busy} message={message} counts={{competencies:content.competencies.length,questions:content.questions.length}} onStart={start} onResume={resume}/>
  if(view==='locked')return <GlassCard className="locked-card"><BadgeCheck size={34}/><h1>{rtl?'تم استلام تقييمك.':'Your assessment has been received.'}</h1><p>{rtl?'التقييم مقفل الآن وبانتظار مراجعة المقيم.':'The assessment is locked and awaiting evaluator review.'}</p>{message&&<div className={`notice ${message.type}`}>{message.text}</div>}<div className="metrics"><Metric value={session.nurse?.name||'—'} label={t.name}/><Metric value={<span dir="ltr">{session.nurse?.job_number}</span>} label={t.jobNumber}/><Metric value={<StatusBadge status={session.status||'submitted'}/>} label={t.status}/></div><button onClick={leave}>{rtl?'العودة لبداية النظام':'Return to start'}</button></GlassCard>
  if(view==='assessment'&&active)return <QuestionView lang={lang} content={content} competency={active} questions={activeQuestions} position={position} answers={answers} saveState={saveState} onChoose={r=>void choose(r)} onPosition={setPosition} onBack={()=>setView('workspace')}/>
  if(view==='review')return <ReviewView lang={lang} content={content} answers={answers} busy={busy} onBack={()=>setView('workspace')} onOpen={open} onSubmit={()=>void submit()}/>
  return <Workspace lang={lang} content={content} answers={answers} name={session.nurse?.name} job={session.nurse?.job_number} resumeCode={session.resume_code} copied={copied} onCopy={()=>void copyCode()} onLeave={leave} onOpen={open} onReview={()=>setView('review')}/>
}
