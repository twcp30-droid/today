import { useEffect, useState } from 'react'
import { loadState, saveState, stampTask, touchState, type StoredState } from '../storage'
import { toggleCompletedOn } from '../task'
import type { Task } from '../types'

export function useTasks() {
  const [state, setState] = useState<StoredState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  function mutate(updater: (tasks: Task[]) => Task[]) {
    setState((prev) => touchState({ ...prev, tasks: updater(prev.tasks) }))
  }

  function setMostImportantObjective(value: string) {
    setState((prev) => {
      const mostImportantObjective = value.trim()
      if (prev.mostImportantObjective === mostImportantObjective) return prev
      return touchState({
        ...prev,
        mostImportantObjective,
        mostImportantObjectiveUpdatedAt: new Date().toISOString(),
      })
    })
  }

  function upsert(task: Task) {
    const updatedAt = new Date().toISOString()
    mutate((prev) => {
      const stamped = stampTask(task, updatedAt)
      const exists = prev.some((item) => item.id === stamped.id)
      let next = exists
        ? prev.map((item) => (item.id === stamped.id ? stamped : item))
        : [...prev, stamped]
      if (stamped.isMit) {
        next = next.map((item) =>
          item.section === stamped.section && item.id !== stamped.id && item.isMit
            ? stampTask({ ...item, isMit: false }, updatedAt)
            : item,
        )
      }
      return next
    })
  }

  function remove(id: string) {
    setState((prev) => {
      if (!prev.tasks.some((item) => item.id === id)) return prev
      const deletedAt = new Date().toISOString()
      const tombstones = [
        ...(prev.tombstones ?? []).filter((tomb) => tomb.id !== id),
        { id, deletedAt },
      ]
      return touchState({
        ...prev,
        tasks: prev.tasks.filter((item) => item.id !== id),
        tombstones,
      })
    })
  }

  function toggleComplete(id: string, date: string) {
    mutate((prev) => prev.map((item) => (item.id === id ? toggleCompletedOn(item, date) : item)))
  }

  return {
    tasks: state.tasks,
    mostImportantObjective: state.mostImportantObjective ?? '',
    stored: state,
    replaceStored: setState,
    upsert,
    remove,
    toggleComplete,
    setMostImportantObjective,
  }
}
