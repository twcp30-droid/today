import { useEffect, useState } from 'react'
import { hashForView, viewFromHash, type AppView } from '../view'

export function useHashView(): [AppView, (view: AppView) => void] {
  const [view, setView] = useState<AppView>(() => viewFromHash(window.location.hash))

  useEffect(() => {
    function onHashChange() {
      setView(viewFromHash(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function go(next: AppView) {
    const hash = hashForView(next)
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
    setView(next)
  }

  return [view, go]
}
