import { useState } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { GlassCard } from '../../components/Ui'
import { supabase } from '../../lib/supabase'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'

export function AuthPanel({lang}:{lang:Lang}){const t=copy[lang],rtl=lang==='ar';const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[mode,setMode]=useState<'in'|'up'>('in'),[busy,setBusy]=useState(false),[msg,setMsg]=useState('')
async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMsg('');const result=mode==='in'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});setBusy(false);if(result.error)setMsg(result.error.message);else if(mode==='up'&&!result.data.session)setMsg(rtl?'تم إنشاء الحساب. تحقق من البريد إذا كان تأكيد البريد مفعّلًا، ثم سجل الدخول.':'Account created. Verify your email if confirmation is enabled, then sign in.')}
return <div className="manager-auth"><GlassCard><div className="badge-icon"><ShieldCheck/></div><div className="eyebrow"><LockKeyhole size={14}/>{t.managerPortal}</div><h1>{t.managerSignIn}</h1><p>{rtl?'الدخول مخصص للمقيمين والمديرين المعتمدين.':'Access is for approved evaluators and administrators.'}</p>{msg&&<div className="notice info">{msg}</div>}<form onSubmit={submit}><label>{t.email}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} dir="ltr"/></label><label>{t.password}<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} dir="ltr"/></label><button className="primary" disabled={busy}>{busy?'…':mode==='in'?t.signIn:t.signUp}</button></form><button className="text-button" onClick={()=>{setMode(mode==='in'?'up':'in');setMsg('')}}>{mode==='in'?t.signUp:t.signIn}</button></GlassCard></div>}
