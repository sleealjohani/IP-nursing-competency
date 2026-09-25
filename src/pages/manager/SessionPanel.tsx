import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { BadgeCheck, ChevronDown, Download, FileText, Printer, RotateCcw, Save, X } from 'lucide-react'
import { GlassCard, StatusBadge } from '../../components/Ui'
import { CATEGORY_LABEL, forms } from '../../lib/content'
import type { AnswerRow, CompetencyForm, EvaluatorProfile, NurseRow, Rating, ReviewRow, SessionRow } from '../../lib/types'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'
import { percentLabel, scoreForm } from '../../lib/scoring'
import { formatDate } from '../../lib/dates'
import type { FillInput } from '../../lib/pdf'
import { signatureBytes } from '../../lib/signatures'
import { supabase } from '../../lib/supabase'

type Props={lang:Lang;session:SessionRow;nurse:NurseRow;answers:AnswerRow[];reviews:ReviewRow[];evaluator:EvaluatorProfile|null;onClose:()=>void;onRefresh:()=>Promise<void>}

const loadPdf=()=>import('../../lib/pdf')

export function SessionPanel(p:Props){
  const t=copy[p.lang],rtl=p.lang==='ar'
  const answers=useMemo(()=>Object.fromEntries(p.answers.map(a=>[a.question_id,a.answer])) as Record<string,Rating>,[p.answers])
  const [open,setOpen]=useState<string|null>(null)
  const [comment,setComment]=useState(''),[staff,setStaff]=useState(''),[remedial,setRemedial]=useState(false),[date,setDate]=useState('')
  const [msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[pdfBusy,setPdfBusy]=useState<string|null>(null)
  const fileBase=`${p.nurse.name} (${p.nurse.job_number})`

  function toggle(f:CompetencyForm){
    if(open===f.id){setOpen(null);return}
    const r=p.reviews.find(x=>x.competency_id===f.id)
    const s=scoreForm(f,answers)
    setOpen(f.id);setComment(r?.evaluator_comments||'');setStaff(r?.staff_comments||'')
    setRemedial(r?.needs_remedial??(s.percent!==null&&s.percent<90));setDate(r?.remedial_date||'');setMsg('')
  }

  async function input(f:CompetencyForm):Promise<FillInput>{
    const review=p.reviews.find(x=>x.competency_id===f.id)||null
    const evaluator=review?.evaluator_snapshot||null
    return {form:f,nurse:p.nurse,answers,review,evaluator,evaluatorSignature:await signatureBytes(evaluator?.signature_path),confirmedAt:p.session.submitted_at}
  }
  async function one(f:CompetencyForm,mode:'download'|'open'){
    setPdfBusy(f.id);setMsg('')
    try{const pdf=await loadPdf();const bytes=await pdf.formPdf(await input(f));if(mode==='open')pdf.openPdf(bytes);else pdf.downloadPdf(bytes,`${f.title} - ${fileBase}.pdf`)}
    catch(e){setMsg(e instanceof Error?e.message:String(e))}
    setPdfBusy(null)
  }
  async function all(){
    setPdfBusy('all');setMsg('')
    try{
      const pdf=await loadPdf()
      const inputs=await Promise.all(forms.map(input))
      const bytes=await pdf.bundlePdf(inputs,`Competency forms — ${fileBase}`,(d,n)=>setMsg(`${t.preparing} ${d}/${n}`))
      pdf.downloadPdf(bytes,`Competency forms - ${fileBase}.pdf`);setMsg('')
    }catch(e){setMsg(e instanceof Error?e.message:String(e))}
    setPdfBusy(null)
  }

  async function save(f:CompetencyForm,finalize:boolean){if(finalize&&!p.evaluator){setMsg(rtl?'احفظ بيانات المقيم أولًا.':'Save the evaluator profile first.');return}setBusy(true);const {data,error}=await supabase.rpc('staff_save_review',{p_session:p.session.id,p_competency:f.id,p_evaluator_comments:comment||null,p_staff_comments:staff||null,p_needs_remedial:remedial,p_remedial_date:date||null,p_finalize:finalize});setBusy(false);const d=data as {ok?:boolean;error?:string}|null;if(error||!d?.ok)setMsg(error?.message||d?.error||'Error');else{setMsg(finalize?(rtl?'تم اعتماد الكفاءة.':'Competency finalized.'):(rtl?'تم الحفظ.':'Saved.'));await p.onRefresh()}}
  async function status(action:'reopen'|'complete'){if(action==='complete'&&!p.evaluator){setMsg(t.needEvaluator);return}if(!confirm(action==='complete'?(rtl?`اعتماد جميع النماذج (${forms.length}) للممرض/ة ${p.nurse.name} وإغلاق التقييم؟`:`Approve all ${forms.length} forms for ${p.nurse.name} and lock the assessment?`):(rtl?'إعادة فتح الجلسة للممرض؟':'Reopen this session?')))return;setBusy(true);const {data,error}=action==='complete'?await supabase.rpc('staff_approve_sessions',{p_sessions:[p.session.id]}):await supabase.rpc('staff_set_status',{p_session:p.session.id,p_action:action,p_reason:null});setBusy(false);const d=data as {ok?:boolean;error?:string}|null;if(error||!d?.ok)setMsg(error?.message||d?.error||'Error');else{await p.onRefresh();p.onClose()}}

  let lastCategory=''
  return createPortal(<div className="drawer-backdrop" dir={rtl?'rtl':'ltr'} onClick={e=>{if(e.target===e.currentTarget)p.onClose()}}><aside className="session-drawer">
    <div className="drawer-head"><div><h2>{p.nurse.name}</h2><small dir="ltr">{p.nurse.job_number}</small></div><button onClick={p.onClose} aria-label="Close"><X/></button></div>
    <div className="nurse-facts"><span><small>{t.unit}</small>{p.nurse.unit||'—'}</span><span><small>{t.jobTitle}</small>{p.nurse.job_title||'—'}</span><span><small>{t.contractDate}</small><b dir="ltr">{formatDate(p.nurse.contract_date)||'—'}</b></span><span><small>{t.submitted}</small><b dir="ltr">{formatDate(p.session.submitted_at)||'—'}</b></span></div>
    <div className="drawer-actions"><StatusBadge status={p.session.status}/><button className="primary" disabled={!!pdfBusy} onClick={()=>void all()}><Download size={15}/><span>{pdfBusy==='all'?t.preparing:t.downloadAll}</span></button>{p.session.status==='completed'?<button onClick={()=>void status('reopen')}><RotateCcw size={15}/><span>{t.reopen}</span></button>:<button disabled={busy||p.session.status==='in_progress'} title={p.session.status==='in_progress'?(rtl?'لم يرسل الممرض التقييم بعد':'The nurse has not submitted yet'):''} onClick={()=>void status('complete')}><BadgeCheck size={15}/><span>{t.approveAllForms}</span></button>}</div>
    {msg&&<div className="notice info">{msg}</div>}
    <div className="form-list">{forms.map(f=>{
      const s=scoreForm(f,answers),r=p.reviews.find(x=>x.competency_id===f.id)
      const cat=CATEGORY_LABEL[f.category]
      const head=f.category!==lastCategory?<div className="review-group" key={`g-${f.category}`}>{rtl?cat?.ar:cat?.en}</div>:null
      lastCategory=f.category
      return [head,<GlassCard key={f.id} className={`form-row ${open===f.id?'open':''}`}>
        <div className="form-row-head">
          <button className="form-row-title" onClick={()=>toggle(f)}><FileText size={16}/><span><b dir="ltr">{f.title}</b><small dir="ltr">{f.code} · {s.answered}/{s.total}{f.scale==='mnmna'?` · M ${s.counts.M} · NM ${s.counts.NM} · NA ${s.counts.NA}`:` · VT ${s.counts.VT} · RD ${s.counts.RD} · UEC ${s.counts.UEC}`}</small></span><ChevronDown size={16} className="chev"/></button>
          <strong className={`score score-${s.result.toLowerCase().replace(' ','-')}`} dir="ltr">{s.result==='Incomplete'?'—':f.scale==='equipment'?'✓':percentLabel(s.percent)}</strong>
          {r?.finalized&&<BadgeCheck size={16} className="finalized" aria-label={t.completed}/>}
          <button className="icon-btn" title={t.openForm} disabled={!!pdfBusy} onClick={()=>void one(f,'open')}><Printer size={15}/></button>
          <button className="icon-btn" title={t.downloadForm} disabled={!!pdfBusy} onClick={()=>void one(f,'download')}>{pdfBusy===f.id?'…':<Download size={15}/>}</button>
        </div>
        {open===f.id&&<div className="form-row-body">
          <div className="answer-list">{f.sections.flatMap(sec=>sec.items.map(q=><div key={q.id}><span dir="ltr">{sec.numeral} {q.label} {q.text}</span><b className={`answer answer-${(answers[q.id]||'none').toLowerCase()}`}>{answers[q.id]||'—'}</b></div>))}</div>
          <label>{t.comments}<textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={220}/></label>
          <label>{t.staffComments}<textarea value={staff} onChange={e=>setStaff(e.target.value)} maxLength={220}/></label>
          <div className="form-grid"><label className="check-label"><input type="checkbox" checked={remedial} onChange={e=>setRemedial(e.target.checked)}/>{t.remedial}</label><label>{t.remedialDate}<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
          <div className="row"><button onClick={()=>void save(f,false)} disabled={busy}><Save size={15}/>{t.save}</button><button className="primary" onClick={()=>void save(f,true)} disabled={busy||!!r?.finalized}><BadgeCheck size={15}/>{r?.finalized?t.completed:t.finalize}</button></div>
        </div>}
      </GlassCard>]
    })}</div>
  </aside></div>,document.body)
}
