import { useEffect, useMemo, useState } from "react";
import { parseISODate } from "../date";
import { recurrenceSummary } from "../recurrence";
import { AREAS, WEEKDAYS, type Area, type Recurrence, type Task } from "../types";

const PRESETS = [
  { id: "none", label: "Once" },
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
] as const;

type Preset = (typeof PRESETS)[number]["id"];

function presetFrom(recurrence: Recurrence | null): Preset {
  if (!recurrence) return "none";
  if (recurrence.frequency === "daily" && recurrence.interval === 1) return "daily";
  if (
    recurrence.frequency === "weekly" &&
    recurrence.interval === 1 &&
    recurrence.weekdays &&
    recurrence.weekdays.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => recurrence.weekdays!.includes(d))
  ) {
    return "weekdays";
  }
  if (recurrence.frequency === "weekly") return "weekly";
  if (recurrence.frequency === "monthly") return "monthly";
  return "weekly";
}

function recurrenceFrom(preset: Preset, weekdays: number[], startDate: string, interval: number): Recurrence | null {
  const n = Math.max(1, interval);
  if (preset === "none") return null;
  if (preset === "daily") return { frequency: "daily", interval: n };
  if (preset === "weekdays") return { frequency: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5] };
  if (preset === "weekly") {
    const start = parseISODate(startDate).getDay();
    return { frequency: "weekly", interval: n, weekdays: weekdays.length ? weekdays : [start] };
  }
  return { frequency: "monthly", interval: n };
}

export function TaskModal(props: {
  date: string;
  area: Area;
  task?: Task;
  mit: boolean;
  onClose: () => void;
  onSave: (input: {
    title: string;
    notes: string;
    area: Area;
    startDate: string;
    recurrence: Recurrence | null;
    mit: boolean;
  }) => void;
  onSkip?: () => void;
  onDeleteSeries?: () => void;
}) {
  const editing = Boolean(props.task);
  const [title, setTitle] = useState(props.task?.title ?? "");
  const [notes, setNotes] = useState(props.task?.notes ?? "");
  const [area, setArea] = useState<Area>(props.task?.area ?? props.area);
  const [startDate, setStartDate] = useState(props.task?.startDate ?? props.date);
  const [mit, setMit] = useState(props.mit);
  const [preset, setPreset] = useState<Preset>(presetFrom(props.task?.recurrence ?? null));
  const [weekdays, setWeekdays] = useState<number[]>(
    props.task?.recurrence?.weekdays ?? [],
  );
  const [interval, setInterval] = useState(props.task?.recurrence?.interval ?? 1);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  const summary = useMemo(
    () => recurrenceSummary(recurrenceFrom(preset, weekdays, startDate, interval)),
    [preset, weekdays, startDate, interval],
  );

  return (
    <div className="overlay" role="presentation" onClick={props.onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          props.onSave({
            title: title.trim(),
            notes: notes.trim(),
            area,
            startDate,
            recurrence: recurrenceFrom(preset, weekdays, startDate, interval),
            mit,
          });
        }}
      >
        <h2 id="task-modal-title">{editing ? "Edit task" : "New task"}</h2>
        <label htmlFor="task-title">Title</label>
        <input
          id="task-title"
          autoFocus
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to happen?"
        />
        <label htmlFor="task-notes">Notes</label>
        <textarea
          id="task-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional context"
        />
        <label>Area</label>
        <div className="area-pills">
          {AREAS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={area === item.id}
              onClick={() => setArea(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label htmlFor="task-date">Date</label>
        <input
          id="task-date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <label className="check-row">
          <input type="checkbox" checked={mit} onChange={(event) => setMit(event.target.checked)} />
          <span>Most important task for this day</span>
        </label>
        <label>Repeats</label>
        <div className="recurrence-pills">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={preset === item.id}
              onClick={() => setPreset(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {preset === "weekly" ? (
          <>
            <label>On days</label>
            <div className="weekday-row">
              {WEEKDAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  aria-pressed={weekdays.includes(day.id)}
                  onClick={() =>
                    setWeekdays((current) =>
                      current.includes(day.id)
                        ? current.filter((value) => value !== day.id)
                        : [...current, day.id].sort(),
                    )
                  }
                >
                  {day.short}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {preset === "daily" || preset === "weekly" || preset === "monthly" ? (
          <>
            <label htmlFor="task-interval">Every</label>
            <input
              id="task-interval"
              type="number"
              min={1}
              max={30}
              value={interval}
              onChange={(event) => setInterval(Number(event.target.value) || 1)}
            />
          </>
        ) : null}
        {summary ? <p className="hint">{summary}</p> : null}
        <div className="modal-actions">
          {editing && props.onSkip ? (
            <button type="button" className="ghost danger" onClick={props.onSkip}>
              Remove this day
            </button>
          ) : null}
          {editing && props.task?.recurrence && props.onDeleteSeries ? (
            <button type="button" className="ghost danger" onClick={props.onDeleteSeries}>
              Delete series
            </button>
          ) : null}
          <button type="button" className="ghost" onClick={props.onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
