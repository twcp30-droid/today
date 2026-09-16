import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarView } from "./components/CalendarView";
import { AreaColumn, TaskRow } from "./components/TaskRow";
import { TaskModal } from "./components/TaskModal";
import { addDays, addMonths, longDateLabel, startOfMonth, todayISO } from "./date";
import {
  addTask,
  deleteSeries,
  isMit,
  loadState,
  moveOccurrence,
  occurrenceCompleted,
  parseImportedState,
  saveState,
  skipOccurrence,
  touchState,
  tasksForDate,
  toggleComplete,
  toggleMit,
  updateTask,
} from "./store";
import { exportState } from "./storage";
import { SyncSettings } from "./components/SyncSettings";
import { useSync } from "./sync/useSync";
import { AREAS, type AppState, type Area, type Recurrence, type Task, type ViewMode } from "./types";

type ModalState =
  | null
  | { mode: "create"; area: Area; date: string }
  | { mode: "edit"; task: Task; date: string };

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<ViewMode>("today");
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [monthDate, setMonthDate] = useState(startOfMonth(todayISO()));
  const [modal, setModal] = useState<ModalState>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = todayISO();
  const sync = useSync(state, setState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const dayTasks = useMemo(() => tasksForDate(state, selectedDate), [state, selectedDate]);
  const mits = (state.mits[selectedDate] ?? [])
    .map((id) => dayTasks.find((task) => task.id === id))
    .filter((task): task is Task => Boolean(task));
  const doneCount = dayTasks.filter((task) => occurrenceCompleted(state, task.id, selectedDate)).length;

  function openCreate(area: Area, date = selectedDate) {
    setModal({ mode: "create", area, date });
  }

  function saveModal(input: {
    title: string;
    notes: string;
    area: Area;
    startDate: string;
    recurrence: Recurrence | null;
    mit: boolean;
  }) {
    if (!modal) return;
    if (modal.mode === "create") {
      setState((current) =>
        addTask(current, {
          title: input.title,
          notes: input.notes,
          area: input.area,
          startDate: input.startDate,
          recurrence: input.recurrence,
          mit: input.mit,
        }),
      );
    } else {
      setState((current) => {
        let next = updateTask(current, modal.task.id, {
          title: input.title,
          notes: input.notes,
          area: input.area,
          startDate: input.startDate,
          recurrence: input.recurrence,
        });
        const currentlyMit = isMit(next, modal.task.id, modal.date);
        if (input.mit !== currentlyMit) next = toggleMit(next, modal.task.id, modal.date);
        return next;
      });
    }
    setSelectedDate(input.startDate);
    setMonthDate(startOfMonth(input.startDate));
    setModal(null);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = touchState(parseImportedState(String(reader.result)));
        setState(next);
        setToast("Backup restored");
      } catch {
        setToast("Could not read that backup");
      }
    };
    reader.readAsText(file);
  }

  function downloadBackup() {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `today-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <circle cx="16" cy="14" r="6.5" fill="#e8b86d" />
              <rect x="6" y="21" width="20" height="2" rx="1" fill="#3d9b8f" />
            </svg>
          </div>
          <div>
            <h1 className="wordmark">TODAY</h1>
            <p className="tag">SYSTEMS · SCADA · ME · {sync.status.passphraseSaved ? "SYNC" : "LOCAL"}</p>
          </div>
        </div>
        <div className="top-actions">
          <div className="view-toggle" role="tablist" aria-label="View">
            <button
              role="tab"
              aria-pressed={view === "today"}
              onClick={() => setView("today")}
            >
              Today
            </button>
            <button
              role="tab"
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
            >
              Month
            </button>
          </div>
          <button
            className={`chip sync-chip${sync.status.error ? " danger-chip" : ""}`}
            onClick={() => {
              setMenuOpen(false);
              setSyncOpen(true);
            }}
          >
            {sync.status.syncing ? "Syncing" : "Sync"}
          </button>
          <button className="primary" onClick={() => openCreate("systems")}>
            New task
          </button>
          <div className="menu">
            <button
              className="icon-btn"
              aria-label="More"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ···
            </button>
            {menuOpen ? (
              <div className="menu-panel">
                <button
                  onClick={() => {
                    downloadBackup();
                    setMenuOpen(false);
                  }}
                >
                  Export backup
                </button>
                <button
                  onClick={() => {
                    fileRef.current?.click();
                    setMenuOpen(false);
                  }}
                >
                  Import backup
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setSyncOpen(true);
                  }}
                >
                  Sync settings
                </button>
                <button
                  onClick={() => {
                    setState((current) => ({ ...current, onboarded: false }));
                    setMenuOpen(false);
                  }}
                >
                  Show guide
                </button>
              </div>
            ) : null}
          </div>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importBackup(file);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      {view === "today" ? (
        <>
          <div className="date-bar">
            <div className="date-nav">
              <button
                className="icon-btn"
                aria-label="Previous day"
                onClick={() => setSelectedDate((date) => addDays(date, -1))}
              >
                ‹
              </button>
              <div>
                <h2 className="date-title">{selectedDate === today ? "Today" : longDateLabel(selectedDate)}</h2>
                <p className="progress">
                  {selectedDate === today ? longDateLabel(selectedDate) : selectedDate} · {doneCount}/{dayTasks.length} done
                </p>
              </div>
              <button
                className="icon-btn"
                aria-label="Next day"
                onClick={() => setSelectedDate((date) => addDays(date, 1))}
              >
                ›
              </button>
            </div>
            {selectedDate !== today ? (
              <button
                className="chip"
                onClick={() => {
                  setSelectedDate(today);
                  setMonthDate(startOfMonth(today));
                }}
              >
                Jump to today
              </button>
            ) : null}
          </div>

          <section className="mit-card" aria-label="Most important tasks">
            <div className="mit-head">
              <h2>MITs</h2>
              <span className="progress">{mits.length} pinned</span>
            </div>
            <p className="hint">The few things that make the day count. Star any task to lift it here.</p>
            <div className="task-list">
              {mits.length === 0 ? <div className="empty">No most-important tasks yet.</div> : null}
              {mits.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  date={selectedDate}
                  state={state}
                  showArea
                  onToggle={() => setState((current) => toggleComplete(current, task.id, selectedDate))}
                  onMit={() => setState((current) => toggleMit(current, task.id, selectedDate))}
                  onEdit={() => setModal({ mode: "edit", task, date: selectedDate })}
                  onTomorrow={() =>
                    setState((current) => moveOccurrence(current, task.id, selectedDate, 1))
                  }
                />
              ))}
            </div>
          </section>

          <div className="areas">
            {AREAS.map((area) => (
              <AreaColumn
                key={area.id}
                area={area.id}
                date={selectedDate}
                state={state}
                onAdd={() => openCreate(area.id)}
                onToggle={(task) => setState((current) => toggleComplete(current, task.id, selectedDate))}
                onMit={(task) => setState((current) => toggleMit(current, task.id, selectedDate))}
                onEdit={(task) => setModal({ mode: "edit", task, date: selectedDate })}
                onTomorrow={(task) =>
                  setState((current) => moveOccurrence(current, task.id, selectedDate, 1))
                }
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <CalendarView
            monthDate={monthDate}
            selectedDate={selectedDate}
            today={today}
            state={state}
            onSelect={(date) => {
              setSelectedDate(date);
            }}
            onPrev={() => setMonthDate((date) => startOfMonth(addMonths(date, -1)))}
            onNext={() => setMonthDate((date) => startOfMonth(addMonths(date, 1)))}
            onJumpToday={() => {
              setSelectedDate(today);
              setMonthDate(startOfMonth(today));
            }}
          />
          <section className="day-drawer">
            <div className="drawer-head section-head">
              <h2>{longDateLabel(selectedDate)}</h2>
              <button className="chip" onClick={() => setView("today")}>
                Open day
              </button>
            </div>
            <p className="hint">
              {dayTasks.length === 0
                ? "No tasks on this date. Add one, or pick another day."
                : `${doneCount} of ${dayTasks.length} complete.`}
            </p>
            <div className="task-list">
              {dayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  date={selectedDate}
                  state={state}
                  showArea
                  onToggle={() => setState((current) => toggleComplete(current, task.id, selectedDate))}
                  onMit={() => setState((current) => toggleMit(current, task.id, selectedDate))}
                  onEdit={() => setModal({ mode: "edit", task, date: selectedDate })}
                  onTomorrow={() =>
                    setState((current) => moveOccurrence(current, task.id, selectedDate, 1))
                  }
                />
              ))}
            </div>
            <div className="top-actions" style={{ marginTop: 12, justifyContent: "flex-start" }}>
              {AREAS.map((area) => (
                <button key={area.id} className="chip" onClick={() => openCreate(area.id)}>
                  Add {area.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <nav className="footer-nav" aria-label="Primary">
        <button aria-pressed={view === "today"} onClick={() => setView("today")}>
          Today
        </button>
        <button aria-pressed={view === "month"} onClick={() => setView("month")}>
          Month
        </button>
        <button onClick={() => openCreate("me")}>New</button>
        <button
          aria-pressed={syncOpen}
          onClick={() => setSyncOpen(true)}
        >
          Sync
        </button>
      </nav>

      {modal ? (
        <TaskModal
          date={modal.date}
          area={modal.mode === "create" ? modal.area : modal.task.area}
          task={modal.mode === "edit" ? modal.task : undefined}
          mit={
            modal.mode === "edit"
              ? isMit(state, modal.task.id, modal.date)
              : false
          }
          onClose={() => setModal(null)}
          onSave={saveModal}
          onSkip={
            modal.mode === "edit"
              ? () => {
                  setState((current) => skipOccurrence(current, modal.task.id, modal.date));
                  setModal(null);
                }
              : undefined
          }
          onDeleteSeries={
            modal.mode === "edit" && modal.task.recurrence
              ? () => {
                  setState((current) => deleteSeries(current, modal.task.id));
                  setModal(null);
                }
              : undefined
          }
        />
      ) : null}

      {!state.onboarded ? (
        <div className="overlay" role="presentation">
          <section className="onboard" role="dialog" aria-labelledby="guide-title">
            <h2 id="guide-title">Three lanes for one day</h2>
            <p className="blurb">
              Today keeps Systems, SCADA, and Me on one screen. Pin a few MITs and repeat what should come back. This device caches everything in localStorage. Set a passphrase under Sync to share an encrypted copy with your other devices.
            </p>
            <ul className="blurb">
              {AREAS.map((area) => (
                <li key={area.id}>
                  <strong>{area.label}.</strong> {area.blurb}
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button
                className="primary"
                onClick={() => setState((current) => ({ ...current, onboarded: true }))}
              >
                Start the day
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {syncOpen ? (
        <SyncSettings
          status={sync.status}
          passphrase={sync.passphrase}
          onClose={() => setSyncOpen(false)}
          onSavePassphrase={(phrase) => {
            sync.persistPassphrase(phrase);
            setToast("Passphrase saved on this device");
          }}
          onSyncNow={() => {
            void sync.runSync("manual");
          }}
          onForget={() => {
            sync.forget();
            setToast("Passphrase forgotten on this device");
          }}
        />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
