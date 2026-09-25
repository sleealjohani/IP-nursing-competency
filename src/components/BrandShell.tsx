import type { ReactNode } from 'react'
import type { Lang } from '../lib/i18n'
import { copy } from '../lib/i18n'

type Props = {
  children: ReactNode
  lang: Lang
  onLangChange: (lang: Lang) => void
  nav?: ReactNode
  compact?: boolean
}

/** Health Holding two-colour line icons from the identity manual, floating gently behind the page. */
const floaters = ['health', 'injection', 'medicine', 'facility', 'customer-service', 'system-operation']

export function BrandShell({ children, lang, onLangChange, nav }: Props) {
  const t = copy[lang]
  return (
    <div className="app-shell" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="floaters" aria-hidden="true">
        {floaters.map((name, index) => (
          <img key={name} src={`/brand/icons/${name}.png`} alt="" className={`floater floater-${index + 1}`} />
        ))}
      </div>

      <header className="app-header">
        <a className="brand" href="/" aria-label={t.appName}>
          <img className="brand-logo" src="/brand/hh-lockup-horizontal.png" alt="الصحة القابضة — Health Holding" />
          <img className="brand-star" src="/brand/hh-star.svg" alt="الصحة القابضة — Health Holding" />
          <span className="brand-titles">
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

      <main className="app-main">
        {children}
      </main>

      <footer className="app-footer">
        <span lang="en" dir="ltr">Powered by <strong>HALRWEOLI</strong></span>
      </footer>
    </div>
  )
}
