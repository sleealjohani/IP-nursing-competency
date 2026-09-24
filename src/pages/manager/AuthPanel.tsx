import { useState } from 'react'
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { GlassCard } from '../../components/Ui'
import { supabase } from '../../lib/supabase'
import type { Lang } from '../../lib/i18n'
import { copy } from '../../lib/i18n'

export function AuthPanel({lang}:{lang:Lang}) {
  const t = copy[lang]
  const rtl = lang === 'ar'
  const [password,setPassword] = useState('')
  const [busy,setBusy] = useState(false)
  const [msg,setMsg] = useState('')

  async function submit(e:React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')

    const { data, error } = await supabase.functions.invoke('evaluator-login', {
      body: { password }
    })

    if (error || !data?.ok || !data?.email) {
      setBusy(false)
      setMsg(rtl ? 'رمز دخول المقيم غير صحيح.' : 'Incorrect evaluator access code.')
      return
    }

    const result = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    })

    setBusy(false)

    if (result.error) {
      setMsg(rtl ? 'تعذر تسجيل دخول المقيم. حاول مرة أخرى.' : 'Evaluator sign-in failed. Please try again.')
    }
  }

  return (
    <div className="manager-auth">
      <GlassCard>
        <div className="badge-icon"><ShieldCheck/></div>
        <div className="eyebrow"><LockKeyhole size={14}/>{t.managerPortal}</div>
        <h1>{t.managerSignIn}</h1>
        <p>{rtl ? 'أدخل رمز دخول المقيم للوصول إلى لوحة المراجعة والاعتماد.' : 'Enter the evaluator access code to open the review and approval dashboard.'}</p>

        {msg && <div className="notice error">{msg}</div>}

        <form onSubmit={submit}>
          <label>
            {rtl ? 'رمز دخول المقيم' : 'Evaluator access code'}
            <div className="password-field">
              <KeyRound size={16}/>
              <input
                type="password"
                required
                value={password}
                onChange={e=>setPassword(e.target.value)}
                autoComplete="current-password"
                dir="ltr"
                placeholder="••••••••••"
              />
            </div>
          </label>

          <button className="primary" disabled={busy}>
            <KeyRound size={16}/>
            {busy ? '…' : t.signIn}
          </button>
        </form>
      </GlassCard>
    </div>
  )
}
