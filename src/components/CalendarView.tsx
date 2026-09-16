import { monthGrid, monthLabel, sameMonth, weekdayOf } from "../date";
import { occurrenceCompleted, occurrenceSkipped } from "../storage";
import { taskOccursOn } from "../recurrence";
import type { AppState, Area } from "../types";
import { WEEKDAYS } from "../types";

export function CalendarView(props: {
  monthDate: string;
  selectedDate: string;
  today: string;
  state: AppState;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpToday: () => void;
}) {
  const days = monthGrid(props.monthDate);

  return (
    <section className="calendar" aria-label="Monthly calendar">
      <div className="date-bar" style={{ marginTop: 0 }}>
        <div className="date-nav">
          <button className="icon-btn" aria-label="Previous month" onClick={props.onPrev}>
            ‹
          </button>
          <h2 className="date-title" style={{ fontSize: 24 }}>
            {monthLabel(props.monthDate)}
          </h2>
          <button className="icon-btn" aria-label="Next month" onClick={props.onNext}>
            ›
          </button>
        </div>
        <button className="chip" onClick={props.onJumpToday}>
          This month
        </button>
      </div>
      <div className="cal-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day.id}>{day.label}</span>
        ))}
      </div>
      <div className="cal-grid">
        {days.map((date) => {
          const counts = countAreas(props.state, date);
          const weekend = weekdayOf(date) === 0 || weekdayOf(date) === 6;
          return (
            <button
              key={date}
              className={[
                "day",
                sameMonth(date, props.monthDate) ? "" : "outside",
                weekend ? "weekend" : "",
                date === props.today ? "today" : "",
                date === props.selectedDate ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => props.onSelect(date)}
            >
              <span className="day-num">{Number(date.slice(8))}</span>
              <span className="dots">
                {(Object.keys(counts) as Area[]).map((area) =>
                  counts[area] ? (
                    <span
                      key={area}
                      className={`dot ${area}${counts[area] === "done" ? " done" : ""}`}
                      title={area}
                    />
                  ) : null,
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function countAreas(state: AppState, date: string): Record<Area, "open" | "done" | null> {
  const result: Record<Area, "open" | "done" | null> = {
    systems: null,
    scada: null,
    me: null,
  };
  for (const task of state.tasks) {
    if (!taskOccursOn(task, date) || occurrenceSkipped(state, task.id, date)) continue;
    const done = occurrenceCompleted(state, task.id, date);
    if (!done) result[task.area] = "open";
    else if (result[task.area] !== "open") result[task.area] = "done";
  }
  return result;
}
