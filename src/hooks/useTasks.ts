import { useEffect, useState } from 'react'
import { loadState, saveState, touchState, type StoredState } from '../storage'
import type { Task } from '../types'

export function useTasks() {
  const [state, setState] = useState<StoredState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  function mutate(updater: (tasks: Task[]) => Task[]) {
    setState((prev) => touchState({ ...prev, tasks: updater(prev.tasks) }))
  }

  function upsert(task: Task) {
    mutate((prev) => {
      const exists = prev.some((item) => item.id === task.id)
      let next = exists ? prev.map((item) => (item.id === task.id ? task : item)) : [...prev, task]
      if (task.isMit) {
        next = next.map((item) =>
          item.section === task.section && item.id !== task.id ? { ...item, isMit: false } : item,
        )
      }
      return next
    })
  }

  function remove(id: string) {
    mutate((prev) => prev.filter((item) => item.id !== id))
  }

  function toggleComplete(id: string, date: string) {
    mutate((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const done = item.completedDates.includes(date)
        return {
          ...item,
          completedDates: done
            ? item.completedDates.filter((entry) => entry !== date)
            : [...item.completedDates, date],
        }
      }),
    )
  }

  return {
    tasks: state.tasks,
    stored: state,
    replaceStored: setState,
    upsert,
    remove,
    toggleComplete,
  }
}
