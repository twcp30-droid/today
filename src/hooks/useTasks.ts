import { useEffect, useState } from 'react'
import { loadTasks, saveTasks } from '../storage'
import type { Task } from '../types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks())

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  function upsert(task: Task) {
    setTasks((prev) => {
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
    setTasks((prev) => prev.filter((item) => item.id !== id))
  }

  function toggleComplete(id: string, date: string) {
    setTasks((prev) =>
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

  return { tasks, upsert, remove, toggleComplete }
}
