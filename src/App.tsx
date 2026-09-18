import { useMemo, useState } from 'react'
import { MonthCalendar } from './components/MonthCalendar'
import { MostImportantObjective } from './components/MostImportantObjective'
import { SectionCard } from './components/SectionCard'
import { SyncSettings } from './components/SyncSettings'
import { TaskSheet } from './components/TaskSheet'
import { UpcomingList } from './components/UpcomingList'
import { formatLong, parseISODate, todayISO } from './dates'
import { useTasks } from './hooks/useTasks'
import { useTheme } from './hooks/useTheme'
import { appearsOn } from './recurrence'
import { useSync } from './sync/useSync'
import { SECTIONS, type SectionId, type Task } from './types'

interface SheetState {
  open: boolean
  section: SectionId
  isMit: boolean
  editing: Task | null
}

export default function App() {
  const today = todayISO()
  const {
    tasks,
    mostImportantObjective,
    stored,
    replaceStored,
    upsert,
    remove,
    toggleComplete,
    setMostImportantObjective,
  } = useTasks()
  const { theme, toggleTheme } = useTheme()
  const sync = useSync(stored, replaceStored)
  const [syncOpen, setSyncOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today)
  const selected = parseISODate(selectedDate)
  const [year, setYear] = useState(selected.getFullYear())
  const [month, setMonth] = useState(selected.getMonth())
  const [sheet, setSheet] = useState<SheetState>({
    open: false,
    section: 'systems',
    isMit: false,
    editing: null,
  })
  const [sheetKey, setSheetKey] = useState(0)

  function openSheet(next: Omit<SheetState, 'open'>) {
    setSheetKey((value) => value + 1)
    setSheet({ open: true, ...next })
  }

  const progress = useMemo(() => {
    const due = tasks.filter((task) => appearsOn(task, selectedDate))
    const done = due.filter((task) => task.completedDates.includes(selectedDate))
    return { due: due.length, done: done.length }
  }, [tasks, selectedDate])

  function selectDate(iso: string) {
    setSelectedDate(iso)
    const next = parseISODate(iso)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Tim’s tracker</p>
          <h1>Today</h1>
          <p className="lede">{formatLong(selectedDate)}</p>
        </div>
        <div className="top-actions">
          {selectedDate !== today ? (
            <button type="button" className="ghost-btn" onClick={() => selectDate(today)}>
              Jump to today
            </button>
          ) : null}
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setSyncOpen(true)}
          >
            {sync.status.syncing ? 'Syncing' : 'Sync'}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <MostImportantObjective value={mostImportantObjective} onSave={setMostImportantObjective} />

      <MonthCalendar
        year={year}
        month={month}
        selectedDate={selectedDate}
        todayDate={today}
        tasks={tasks}
        onSelectDate={selectDate}
        onPrevMonth={() => shiftMonth(-1)}
        onNextMonth={() => shiftMonth(1)}
      />

      <p className="progress">
        {progress.due === 0
          ? 'Nothing assigned to this day'
          : `${progress.done} of ${progress.due} complete`}
      </p>

      {SECTIONS.map((section) => (
        <SectionCard
          key={section}
          section={section}
          date={selectedDate}
          tasks={tasks.filter((task) => task.section === section)}
          onAdd={(isMit) => openSheet({ section, isMit, editing: null })}
          onToggle={(id) => toggleComplete(id, selectedDate)}
          onEdit={(task) => openSheet({ section: task.section, isMit: task.isMit, editing: task })}
        />
      ))}

      <UpcomingList
        tasks={tasks}
        date={selectedDate}
        onEdit={(task) => openSheet({ section: task.section, isMit: task.isMit, editing: task })}
      />

      <TaskSheet
        key={sheetKey}
        open={sheet.open}
        date={selectedDate}
        presetSection={sheet.section}
        presetMit={sheet.isMit}
        editing={sheet.editing}
        onClose={() => setSheet((prev) => ({ ...prev, open: false }))}
        onSave={upsert}
        onDelete={remove}
      />

      <SyncSettings
        open={syncOpen}
        status={sync.status}
        passphrase={sync.passphrase}
        onClose={() => setSyncOpen(false)}
        onSavePassphrase={(phrase) => sync.persistPassphrase(phrase)}
        onSyncNow={() => {
          void sync.runSync('manual')
        }}
        onForget={() => sync.forget()}
      />
    </div>
  )
}
