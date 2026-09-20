import { hashForView, type AppView } from '../view'

interface AppNavProps {
  view: AppView
}

export function AppNav({ view }: AppNavProps) {
  return (
    <nav className="app-nav" aria-label="Primary">
      <a
        className={view === 'today' ? 'is-on' : ''}
        href={hashForView('today')}
        aria-current={view === 'today' ? 'page' : undefined}
      >
        Today
      </a>
      <a
        className={view === 'tables' ? 'is-on' : ''}
        href={hashForView('tables')}
        aria-current={view === 'tables' ? 'page' : undefined}
      >
        Tables
      </a>
    </nav>
  )
}
