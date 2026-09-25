import { useEffect, useMemo, useState } from 'react'
import { Activity, BadgeCheck, FileArchive, LogOut, Search, Settings, ShieldCheck } from 'lucide-react'
import type { Session, User } from '@supabase/supabase-js'
import { GlassCard, Metric, Spinner, StatusBadge } from '../components/Ui'
import { questions } from '../lib/content'
import { supabase } from '../lib/supabase'
import type { AnswerRow, EvaluatorProfile, NurseRow, ReviewRow, SessionRow } from '../lib/types'
import type { Lang } from '../lib/i18n'
import { copy } from '../lib/i18n'
import { AuthPanel } from './manager/AuthPanel'
import { EvaluatorPanel } from './manager/EvaluatorPanel'
import { SessionPanel } from './manager/SessionPanel'

/** PostgREST returns at most 1000 rows per request: page through the whole table. */
async function fetchAll<T>(table:string,order:string){const rows:T[]=[];for(let from=0;;from+=1000){const {data,error}=await supabase.from(table).select('*').order(order).range(from,from+999);if(error)return {data:null,error};rows.push(...((data||[]) as T[]));if(!data||data.length<1000)return {data:rows,error:null}}}

type StaffProfile={id:string;email:string|null;full_name:string|null;role:'pending'|'manager'|'admin'}
type Dashboard={sessions:SessionRow[];nurses:NurseRow[];answers:AnswerRow[];reviews:ReviewRow[]}

export function ManagerPortal({lang}:{lang:Lang}){
  const t=copy[lang],rtl=lang==='ar'
  const [auth,setAuth]=useState<Session|null>(null),[user,setUser]=useState<User|null>(null)
  const [profile,setProfile]=useState<StaffProfile|null>(null),[evaluator,setEvaluator]=useState<EvaluatorProfile|null>(null)
  const [data,setData]=useState<Dashboard>({sessions:[],nurses:[],answers:[],reviews:[]})
  const [loading,setLoading]=useState(true),[working,setWorking]=useState(''),[notice,setNotice]=useState(''),[message,setMessage]=useState(''),[search,setSearch]=useState(''),[status,setStatus]=useState('all'),[selected,setSelected]=useState<string|null>(null),[tab,setTab]=useState<'dashboard'|'evaluator'>('dashboard')

  useEffect(()=>{void boot();const {data:s}=supabase.auth.onAuthStateChange((_e,session)=>{setAuth(session);setUser(session?.user||null);if(session)void loadStaff(session.user);else{setProfile(null);setLoading(false)}});return()=>s.subscription.unsubscribe()},[])
  async function boot(){setLoading(true);const {data:{session}}=await supabase.auth.getSession();setAuth(session);setUser(session?.user||null);if(session)await loadStaff(session.user);else setLoading(false)}
  async function loadStaff(u:User){const {data:p,error}=await supabase.from('profiles').select('*').eq('id',u.id).single();if(error){setMessage(error.message);setLoading(false);return}setProfile(p as StaffProfile);if((p as StaffProfile).role!=='pending')await refresh(u.id);else setLoading(false)}
  async function refresh(userId=user?.id){if(!userId)return;setLoading(true);setMessage('');const [sessions,nurses,answers,reviews,evalp]=await Promise.all([
    supabase.from('assessment_sessions').select('*').order('updated_at',{ascending:false}),
    fetchAll<NurseRow>('nurses','name'),
    fetchAll<AnswerRow>('assessment_answers','id'),
    fetchAll<ReviewRow>('manager_reviews','id'),
    supabase.from('evaluator_profiles').select('*').eq('user_id',userId).maybeSingle(),
  ]);const err=sessions.error||nurses.error||answers.error||reviews.error||evalp.error;if(err)setMessage(err.message);else{setData({sessions:(sessions.data||[]) as SessionRow[],nurses:(nurses.data||[]) as NurseRow[],answers:(answers.data||[]) as AnswerRow[],reviews:(reviews.data||[]) as ReviewRow[]});setEvaluator((evalp.data as EvaluatorProfile|null)||null)}setLoading(false)}
  const filtered=useMemo(()=>data.sessions.filter(s=>{const n=data.nurses.find(x=>x.id===s.nurse_id);const q=search.trim().toLowerCase();return(status==='all'||s.status===status)&&(!q||n?.name.toLowerCase().includes(q)||n?.job_number.toLowerCase().includes(q))}),[data.sessions,data.nurses,search,status])
  const pending=data.sessions.filter(s=>['submitted','reopened'].includes(s.status))
  async function approveAll(){if(!evaluator){setMessage(t.needEvaluator);return}if(!pending.length)return;if(!confirm(rtl?`اعتماد جميع النماذج لعدد ${pending.length} ممرض/ة أرسلوا تقييماتهم؟ سيتم إغلاق هذه التقييمات.`:`Approve every form for ${pending.length} submitted nurse(s)? Their assessments will be locked.`))return;setWorking('approve');setMessage('');setNotice('');const {data:res,error}=await supabase.rpc('staff_approve_sessions',{p_sessions:pending.map(s=>s.id)});setWorking('');const d=res as {ok?:boolean;error?:string;approved?:number}|null;if(error||!d?.ok){setMessage(d?.error==='NO_EVALUATOR_PROFILE'?t.needEvaluator:error?.message||d?.error||'Error');return}setNotice(rtl?`تم اعتماد ${d.approved} تقييم.`:`${d.approved} assessment(s) approved.`);await refresh()}
  async function downloadApproved(){setWorking('zip');setMessage('');setNotice(t.preparing);try{const {approvedFormsZip,downloadZip}=await import('../lib/exportApproved');const {bytes,count}=await approvedFormsZip(data,(d,n)=>setNotice(`${t.preparing} ${d}/${n}`));if(!bytes){setNotice(t.noApproved)}else{downloadZip(bytes,`Approved competency forms ${new Date().toISOString().slice(0,10)}.zip`);setNotice(rtl?`تم تنزيل ${count} ملف PDF.`:`${count} nurse PDF(s) downloaded.`)}}catch(e){setNotice('');setMessage(e instanceof Error?e.message:String(e))}setWorking('')}
  const selectedSession=data.sessions.find(s=>s.id===selected),selectedNurse=selectedSession?data.nurses.find(n=>n.id===selectedSession.nurse_id):undefined

  if(!auth||!user)return <AuthPanel lang={lang}/>
  if(loading&&!profile)return <GlassCard><Spinner label={rtl?'جارٍ التحقق من الصلاحيات…':'Checking access…'}/></GlassCard>
  if(profile?.role==='pending')return <GlassCard className="locked-card"><ShieldCheck size={34}/><h1>{t.pending}</h1><p>{user.email}</p><button onClick={()=>supabase.auth.signOut()}>{t.signOut}</button></GlassCard>

  const submitted=data.sessions.filter(s=>s.status==='submitted').length,completed=data.sessions.filter(s=>s.status==='completed').length,inProgress=data.sessions.filter(s=>['in_progress','reopened'].includes(s.status)).length
  return <div className="manager-layout">
    <aside className="manager-side glass-card"><div className="manager-role"><span><ShieldCheck size={18}/></span><div><b>{profile?.full_name||user.email}</b><small>{profile?.role}</small></div></div><button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}><Activity size={17}/>{t.dashboard}</button><button className={tab==='evaluator'?'active':''} onClick={()=>setTab('evaluator')}><Settings size={17}/>{t.evaluatorProfile}</button><button onClick={()=>supabase.auth.signOut()}><LogOut size={17}/>{t.signOut}</button></aside>
    <div className="manager-content">{message&&<div className="notice error">{message}</div>}{tab==='evaluator'?<EvaluatorPanel lang={lang} userId={user.id} profile={evaluator} onSaved={setEvaluator}/>:<>
      <div className="page-title"><div><div className="eyebrow"><Activity size={14}/>{t.dashboard}</div><h1>{rtl?'مركز متابعة كفاءات التمريض':'Nursing Competency Control Center'}</h1></div><div className="row"><button className="primary" disabled={!!working||!pending.length} onClick={()=>void approveAll()}><BadgeCheck size={16}/>{t.approveAll}{pending.length?` (${pending.length})`:''}</button><button className="icon-btn" disabled={!!working} title={t.downloadApprovedZip} aria-label={t.downloadApprovedZip} onClick={()=>void downloadApproved()}><FileArchive size={18}/></button><button onClick={()=>void refresh()}>{rtl?'تحديث':'Refresh'}</button></div></div>{notice&&<div className="notice info">{notice}</div>}
      <div className="metrics"><Metric value={data.nurses.length} label={rtl?'إجمالي الممرضين':'Total nurses'}/><Metric value={submitted} label={t.submitted}/><Metric value={inProgress} label={t.inProgress}/><Metric value={completed} label={t.completed}/></div>
      <GlassCard><div className="filter-row"><label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">{t.all}</option><option value="in_progress">in_progress</option><option value="submitted">submitted</option><option value="reopened">reopened</option><option value="completed">completed</option></select></div><div className="session-table"><div className="table-head"><span>{t.nurses}</span><span>{t.status}</span><span>{rtl?'بدأ':'Started'}</span><span>{t.actions}</span></div>{loading?<Spinner/>:filtered.length===0?<p className="empty">{t.noData}</p>:filtered.map(s=>{const n=data.nurses.find(x=>x.id===s.nurse_id);const count=data.answers.filter(a=>a.session_id===s.id).length;return <div className="table-row" key={s.id}><span><b>{n?.name||'—'}</b><small dir="ltr">{n?.job_number}</small></span><span><StatusBadge status={s.status}/><small dir="ltr">{count}/{questions.length}</small></span><span dir="ltr">{new Date(s.started_at).toLocaleDateString('en-GB')}</span><span><button onClick={()=>setSelected(s.id)}>{t.view}</button></span></div>})}</div></GlassCard>
    </>}</div>
    {selectedSession&&selectedNurse&&<SessionPanel lang={lang} session={selectedSession} nurse={selectedNurse} answers={data.answers.filter(a=>a.session_id===selectedSession.id)} reviews={data.reviews.filter(r=>r.session_id===selectedSession.id)} evaluator={evaluator} onClose={()=>setSelected(null)} onRefresh={async()=>{await refresh();}}/>}
  </div>
}
