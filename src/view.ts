export type AppView = 'today' | 'tables'

export function viewFromHash(hash: string): AppView {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '')
  return path === 'tables' ? 'tables' : 'today'
}

export function hashForView(view: AppView): string {
  return view === 'tables' ? '#/tables' : '#/'
}
