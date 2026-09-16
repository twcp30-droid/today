import { occurrenceCompleted, occurrenceSkipped } from "../storage";
import { recurrenceSummary, taskOccursOn } from "../recurrence";
import type { AppState, Area, Task } from "../types";
import { AREAS } from "../types";

function StarIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.6 9.8 5.4l4.2.4-3.2 2.8.9 4.1L8 10.8 4.3 12.7l.9-4.1L2 5.8l4.2-.4z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function TaskRow(props: {
  task: Task;
  date: string;
  state: AppState;
  showArea?: boolean;
  onToggle: () => void;
  onMit: () => void;
  onEdit: () => void;
  onTomorrow: () => void;
}) {
  const done = occurrenceCompleted(props.state, props.task.id, props.date);
  const mit = (props.state.mits[props.date] ?? []).includes(props.task.id);
  const recur = recurrenceSummary(props.task.recurrence);
  return (
    <article className={`task${done ? " done" : ""}`}>
      <button
        className="check"
        aria-label={done ? "Mark not done" : "Mark done"}
        aria-pressed={done}
        onClick={props.onToggle}
      >
        {done ? (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 6.2 4.6 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        ) : null}
      </button>
      <div className="task-main" style={{ display: "block" }}>
        <p className="title">{props.task.title}</p>
        {props.task.notes ? <p className="hint">{props.task.notes}</p> : null}
        <div className="meta">
          {props.showArea ? (
            <span className={`badge area-${props.task.area}`}>
              {AREAS.find((area) => area.id === props.task.area)?.label}
            </span>
          ) : null}
          {recur ? <span className="badge">{recur}</span> : null}
        </div>
      </div>
      <div className="task-actions">
        <button
          className="icon-btn star"
          aria-label="Most important"
          aria-pressed={mit}
          onClick={props.onMit}
        >
          <StarIcon on={mit} />
        </button>
        <button className="icon-btn" aria-label="Move to next day" title="Move +1 day" onClick={props.onTomorrow}>
          +1
        </button>
        <button className="icon-btn" aria-label="Edit task" onClick={props.onEdit}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M9.2 2.1 11.9 4.8 4.7 12H2v-2.7zM10.1 1.2c.4-.4 1-.4 1.4 0l1.3 1.3c.4.4.4 1 0 1.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
      </div>
    </article>
  );
}

export function AreaColumn(props: {
  area: Area;
  date: string;
  state: AppState;
  onAdd: () => void;
  onToggle: (task: Task) => void;
  onMit: (task: Task) => void;
  onEdit: (task: Task) => void;
  onTomorrow: (task: Task) => void;
}) {
  const meta = AREAS.find((item) => item.id === props.area)!;
  const tasks = props.state.tasks
    .filter(
      (task) =>
        task.area === props.area &&
        taskOccursOn(task, props.date) &&
        !occurrenceSkipped(props.state, task.id, props.date),
    )
    .sort((a, b) => Number(occurrenceCompleted(props.state, a.id, props.date)) - Number(occurrenceCompleted(props.state, b.id, props.date)));

  return (
    <section className="area-card" data-area={props.area}>
      <div className="section-head">
        <h2>{meta.label}</h2>
        <button className="chip" onClick={props.onAdd}>
          Add
        </button>
      </div>
      <p className="blurb">{meta.blurb}</p>
      <div className="task-list">
        {tasks.length === 0 ? <div className="empty">Nothing here yet.</div> : null}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            date={props.date}
            state={props.state}
            onToggle={() => props.onToggle(task)}
            onMit={() => props.onMit(task)}
            onEdit={() => props.onEdit(task)}
            onTomorrow={() => props.onTomorrow(task)}
          />
        ))}
      </div>
    </section>
  );
}
