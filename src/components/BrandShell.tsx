import type { ReactNode } from 'react'
import { Activity, Cross, Droplets, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react'
import type { Lang } from '../lib/i18n'
import { copy } from '../lib/i18n'

type Props = {
  children: ReactNode
  lang: Lang
  onLangChange: (lang: Lang) => void
  nav?: ReactNode
  compact?: boolean
}

const floaters = [Activity, Cross, Droplets, HeartPulse, ShieldCheck, Stethoscope]

export function BrandShell({ children, lang, onLangChange, nav, compact }: Props) {
  const t = copy[lang]
  return (
    <div className="app-shell" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="floaters" aria-hidden="true">
        {floaters.map((Icon, index) => (
          <Icon key={index} className={`floater floater-${index + 1}`} strokeWidth={1.4} />
        ))}
      </div>

      <header className={`app-header ${compact ? 'compact' : ''}`}>
        <a className="brand" href="/" aria-label="Nursing Competency home">
          <span className="brand-mark"><HeartPulse size={22} /></span>
          <span>
            <strong>{t.appName}</strong>
            <small>{t.appDescriptor}</small>
          </span>
        </a>
        <div className="header-actions">
          {nav}
          <div className="lang-switch" role="group" aria-label="Language">
            <button className={lang === 'ar' ? 'active' : ''} onClick={() => onLangChange('ar')}>ع</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => onLangChange('en')}>EN</button>
          </div>
        </div>
      </header>

      <main className="app-main page-enter">
        {children}
      </main>

      <footer className="app-footer">
        <span>Clinical Digital Experience</span>
        <span className="footer-dot">•</span>
        <span>Powered by <strong>HALRWEOLI</strong></span>
      </footer>
    </div>
  )
}
