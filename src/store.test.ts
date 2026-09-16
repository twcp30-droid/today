import { addDays, monthGrid, startOfMonth } from "./date";
import {
  addTask,
  deleteSeries,
  isMit,
  moveOccurrence,
  skipOccurrence,
  tasksForDate,
  toggleComplete,
} from "./store";
import { emptyState } from "./storage";

describe("store operations", () => {
  it("adds a one-shot MIT and completes it for that day only", () => {
    let state = addTask(emptyState(), {
      title: "Write report",
      area: "me",
      startDate: "2026-09-16",
      mit: true,
    });
    const id = state.tasks[0].id;
    expect(isMit(state, id, "2026-09-16")).toBe(true);
    expect(tasksForDate(state, "2026-09-16")).toHaveLength(1);
    expect(tasksForDate(state, "2026-09-17")).toHaveLength(0);

    state = toggleComplete(state, id, "2026-09-16");
    expect(state.completions[`${id}::2026-09-16`]).toBeTruthy();
  });

  it("skips one weekly occurrence without deleting the series", () => {
    let state = addTask(emptyState(), {
      title: "Standup",
      area: "scada",
      startDate: "2026-09-16",
      recurrence: { frequency: "weekly", interval: 1, weekdays: [3] },
    });
    const id = state.tasks[0].id;
    expect(tasksForDate(state, "2026-09-23")).toHaveLength(1);
    state = skipOccurrence(state, id, "2026-09-23");
    expect(tasksForDate(state, "2026-09-23")).toHaveLength(0);
    expect(tasksForDate(state, "2026-09-30")).toHaveLength(1);
  });

  it("moves a one-shot task and its MIT to the next day", () => {
    let state = addTask(emptyState(), {
      title: "Call",
      area: "systems",
      startDate: "2026-09-16",
      mit: true,
    });
    const id = state.tasks[0].id;
    state = moveOccurrence(state, id, "2026-09-16", 1);
    expect(state.tasks[0].startDate).toBe("2026-09-17");
    expect(isMit(state, id, "2026-09-16")).toBe(false);
    expect(isMit(state, id, "2026-09-17")).toBe(true);
  });

  it("deleteSeries removes completions and MITs", () => {
    let state = addTask(emptyState(), {
      title: "Patrol",
      area: "scada",
      startDate: "2026-09-16",
      recurrence: { frequency: "daily", interval: 1 },
      mit: true,
    });
    const id = state.tasks[0].id;
    state = toggleComplete(state, id, "2026-09-16");
    state = deleteSeries(state, id);
    expect(state.tasks).toHaveLength(0);
    expect(state.completions).toEqual({});
    expect(state.mits["2026-09-16"]).toEqual([]);
  });
});

describe("month grid", () => {
  it("starts on Sunday and includes 42 cells", () => {
    const grid = monthGrid("2026-09-16");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-08-30");
    expect(startOfMonth("2026-09-16")).toBe("2026-09-01");
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });
});
