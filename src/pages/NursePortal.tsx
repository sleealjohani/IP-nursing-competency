import { useEffect, useRef, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { GlassCard, Metric, Spinner, StatusBadge } from '../components/Ui'
import { forms, questions } from '../lib/content'
import type { NurseSessionPayload, NurseStartInput, Rating } from '../lib/types'
import type { Lang } from '../lib/i18n'
import { copy } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { EntryPanel } from './nurse/EntryPanel'
import { QuestionView } from './nurse/QuestionView'
import { ReviewView } from './nurse/ReviewView'

const TOKEN_KEY='ip_nursing_session_token'
type View='entry'|'assessment'|'review'|'locked'

const firstOpen=(answers:Record<string,Rating>)=>{const i=questions.findIndex(q=>!answers[q.id]);return i<0?null:i}

export function NursePortal({lang}:{lang:Lang}){
  const rtl=lang==='ar',t=copy[lang]
  const [session,setSession]=useState<NurseSessionPayload|null>(null)
  const [token,setToken]=useState<string|null>(()=>localStorage.getItem(TOKEN_KEY))
  const [view,setView]=useState<View>(token?'assessment':'entry')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState<{type:'error'|'success'|'info';text:string}|null>(null)
  const [saveState,setSaveState]=useState('idle')
  const [position,setPosition]=useState(0)
  const [copied,setCopied]=useState(false)
  const timer=useRef<number|null>(null)
  const answers=session?.answers||{}

  useEffect(()=>{if(token)void hydrate(token)},[token])
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])

  // Moving between statements keeps the page still: the answer buttons stay under the nurse's finger.
  function go(pos:number){setPosition(pos);setSaveState('idle')}

  async function hydrate(current:string){setBusy(true);const {data,error}=await supabase.rpc('nurse_get',{p_token:current});setBusy(false);const p=data as NurseSessionPayload|null;if(error||!p?.ok){localStorage.removeItem(TOKEN_KEY);setToken(null);setSession(null);setView('entry');setMessage({type:'error',text:rtl?'تعذر استعادة جلسة التقييم.':'Could not restore the assessment session.'});return}setSession(p);if(p.status==='submitted'||p.status==='completed'){setView('locked');return}const open=firstOpen(p.answers||{});if(open===null)setView('review');else{setPosition(open);setView('assessment')}}
  async function start(input:NurseStartInput){setBusy(true);setMessage(null);const {data,error}=await supabase.rpc('nurse_start',{p_name:input.name.trim(),p_job_number:input.job_number.trim(),p_unit:input.unit.trim(),p_job_title:input.job_title.trim(),p_contract_date:input.contract_date||null});setBusy(false);const p=data as NurseSessionPayload|null;if(error||!p?.ok||!p.token){const m:Record<string,string>={SESSION_EXISTS:rtl?'يوجد تقييم غير مكتمل. استخدم الاستكمال.':'An unfinished assessment exists. Use Resume.',ALREADY_SUBMITTED:rtl?'تم إرسال تقييم سابق وبانتظار المراجعة.':'A prior assessment is awaiting review.',INVALID_NAME:rtl?'تحقق من الاسم.':'Check the name.',INVALID_JOB_NUMBER:rtl?'تحقق من الرقم الوظيفي (أحرف إنجليزية وأرقام فقط).':'Check the job number (English letters and digits only).'};setMessage({type:'error',text:m[p?.error||'']||error?.message||(rtl?'تعذر بدء التقييم.':'Could not start assessment.')});return}localStorage.setItem(TOKEN_KEY,p.token);setToken(p.token)}
  async function resume(job:string,code:string){setBusy(true);setMessage(null);const {data,error}=await supabase.rpc('nurse_resume',{p_job_number:job.trim(),p_code:code.trim().toUpperCase()});setBusy(false);const p=data as NurseSessionPayload|null;if(error||!p?.ok||!p.token){const m:Record<string,string>={NOT_FOUND:rtl?'لم يتم العثور على تقييم قابل للاستكمال.':'No resumable assessment found.',INVALID_CODE:rtl?'رمز الاستكمال غير صحيح.':'Resume code is incorrect.',LOCKED:rtl?'تم قفل محاولات الاستكمال.':'Resume attempts are locked.'};setMessage({type:'error',text:m[p?.error||'']||error?.message||(rtl?'تعذر الاستكمال.':'Could not resume.')});return}localStorage.setItem(TOKEN_KEY,p.token);setToken(p.token)}

  async function choose(r:Rating){
    const q=questions[position];if(!q||!token)return
    const previous=answers[q.id]
    const next={...answers,[q.id]:r}
    setSession(s=>s?{...s,answers:next}:s);setSaveState('saving')
    if(timer.current)clearTimeout(timer.current)
    const {data,error}=await supabase.rpc('nurse_save_answers',{p_token:token,p_answers:{[q.id]:r}})
    const p=data as NurseSessionPayload|null
    if(error||p?.ok===false||p?.saved===0){
      setSession(s=>{if(!s)return s;const a={...(s.answers||{})};if(previous)a[q.id]=previous;else delete a[q.id];return{...s,answers:a}})
      setSaveState('error');return
    }
    setSaveState('saved')
    if(previous)return
    timer.current=window.setTimeout(()=>{
      const ahead=questions.findIndex(x=>x.index>position&&!next[x.id])
      if(ahead>=0)go(ahead)
      else if(firstOpen(next)===null){setView('review');scrollTo({top:0})}
      else go(Math.min(position+1,questions.length-1))
    },360)
  }
  async function submit(){if(!token||questions.some(q=>!answers[q.id]))return;if(!confirm(rtl?'هل أنت متأكد من إرسال جميع النماذج للإدارة؟ لن تتمكن من التعديل بعد الإرسال.':'Send all forms to the administration? You cannot change answers after submitting.'))return;setBusy(true);const {data,error}=await supabase.rpc('nurse_submit',{p_token:token});setBusy(false);const p=data as NurseSessionPayload|null;if(error||!p?.ok){setMessage({type:'error',text:p?.error==='INCOMPLETE'?(rtl?`يوجد ${p.missing} عبارة غير محفوظة. أعد اختيارها ثم أرسل.`:`${p.missing} statements are not saved. Answer them again, then submit.`):error?.message||(rtl?'تعذر إرسال التقييم.':'Could not submit assessment.')});return}await hydrate(token);setMessage({type:'success',text:t.submittedForReview})}
  function leave(){localStorage.removeItem(TOKEN_KEY);setToken(null);setSession(null);setView('entry');setMessage(null)}
  async function copyCode(){if(!session?.resume_code)return;await navigator.clipboard.writeText(session.resume_code);setCopied(true);setTimeout(()=>setCopied(false),1400)}

  if(busy&&token&&!session)return <GlassCard><Spinner label={rtl?'جارٍ استعادة التقييم…':'Restoring assessment…'}/></GlassCard>
  if(view==='entry'||!session)return <EntryPanel lang={lang} busy={busy} message={message} counts={{forms:forms.length,questions:questions.length}} onStart={input=>void start(input)} onResume={resume}/>
  if(view==='locked')return <GlassCard className="locked-card"><img className="flow-pattern" src="/brand/pattern-flow-of-care.png" alt="" aria-hidden="true"/><BadgeCheck size={34}/><h1>{rtl?'تم استلام نماذجك.':'Your forms have been received.'}</h1><p>{rtl?'تم إرسال كل نموذج باسمك إلى الإدارة، والتقييم مقفل الآن بانتظار مراجعة المقيم.':'Each form was sent to the administration under your name. The assessment is locked and awaiting evaluator review.'}</p>{message&&<div className={`notice ${message.type}`}>{message.text}</div>}<div className="metrics"><Metric value={session.nurse?.name||'—'} label={t.name}/><Metric value={<span dir="ltr">{session.nurse?.job_number}</span>} label={t.jobNumber}/><Metric value={forms.length} label={rtl?'نموذج':'Forms'}/><Metric value={<StatusBadge status={session.status||'submitted'}/>} label={t.status}/></div><button onClick={leave}>{rtl?'العودة لبداية النظام':'Return to start'}</button></GlassCard>
  if(view==='review')return <>{message&&<div className={`notice ${message.type}`}>{message.text}</div>}<ReviewView lang={lang} answers={answers} busy={busy} onBack={()=>{setView('assessment')}} onOpen={pos=>{go(pos);setView('assessment');scrollTo({top:0})}} onSubmit={()=>void submit()}/></>
  return <QuestionView lang={lang} position={position} answers={answers} saveState={saveState} name={session.nurse?.name} resumeCode={session.resume_code} copied={copied} onCopy={()=>void copyCode()} onLeave={leave} onChoose={r=>void choose(r)} onPosition={go} onReview={()=>{setView('review');scrollTo({top:0})}}/>
}
