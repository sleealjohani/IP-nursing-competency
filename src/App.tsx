import { useEffect, useState } from 'react'
import { ClipboardCheck, ShieldCheck } from 'lucide-react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BrandShell } from './components/BrandShell'
import { NursePortal } from './pages/NursePortal'
import { ManagerPortal } from './pages/ManagerPortal'
import { PrintPage } from './pages/PrintPage'
import type { Lang } from './lib/i18n'

function AppRoutes() {
  const location = useLocation()
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('ip_nursing_lang') as Lang) || 'ar')

  useEffect(() => {
    localStorage.setItem('ip_nursing_lang', lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  if (location.pathname.startsWith('/print/')) return <PrintPage />

  const onManager = location.pathname.startsWith('/manager')
  const nav = (
    <Link className="header-link" to={onManager ? '/' : '/manager'}>
      {onManager ? <ClipboardCheck size={16}/> : <ShieldCheck size={16}/>}<span>{onManager ? (lang === 'ar' ? 'بوابة التمريض' : 'Nurse portal') : (lang === 'ar' ? 'بوابة المقيم' : 'Evaluator portal')}</span>
    </Link>
  )

  return (
    <BrandShell lang={lang} onLangChange={setLang} nav={nav} compact={onManager}>
      <Routes>
        <Route path="/" element={<NursePortal lang={lang}/>} />
        <Route path="/manager" element={<ManagerPortal lang={lang}/>} />
        <Route path="*" element={<Navigate to="/" replace/>} />
      </Routes>
    </BrandShell>
  )
}

export default function App() {
  return <BrowserRouter><AppRoutes/></BrowserRouter>
}
