import { addMonths, diffDays, parseISODate, weekdayOf } from "./date";
import type { Recurrence, Task } from "./types";

export function occurrenceKey(taskId: string, date: string): string {
  return `${taskId}::${date}`;
}

export function occursOn(
  startDate: string,
  recurrence: Recurrence | null,
  date: string,
): boolean {
  if (date < startDate) return false;
  if (!recurrence) return date === startDate;

  const interval = Math.max(1, Math.floor(recurrence.interval || 1));

  if (recurrence.frequency === "daily") {
    return diffDays(startDate, date) % interval === 0;
  }

  if (recurrence.frequency === "weekly") {
    const weekdays =
      recurrence.weekdays && recurrence.weekdays.length > 0
        ? recurrence.weekdays
        : [weekdayOf(startDate)];
    if (!weekdays.includes(weekdayOf(date))) return false;
    const weeks = Math.floor(diffDays(startDate, date) / 7);
    return weeks % interval === 0;
  }

  if (recurrence.frequency === "monthly") {
    const start = parseISODate(startDate);
    const target = parseISODate(date);
    const months =
      (target.getFullYear() - start.getFullYear()) * 12 +
      (target.getMonth() - start.getMonth());
    if (months < 0 || months % interval !== 0) return false;
    const expected = addMonths(startDate, months);
    return expected === date;
  }

  return false;
}

export function taskOccursOn(task: Task, date: string): boolean {
  if (task.archived) return false;
  return occursOn(task.startDate, task.recurrence, date);
}

export function recurrenceSummary(recurrence: Recurrence | null): string | null {
  if (!recurrence) return null;
  const n = Math.max(1, recurrence.interval || 1);
  if (recurrence.frequency === "daily") {
    return n === 1 ? "Daily" : `Every ${n} days`;
  }
  if (recurrence.frequency === "weekly") {
    const days = recurrence.weekdays ?? [];
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayPart =
      days.length === 0
        ? ""
        : days.length === 5 &&
            [1, 2, 3, 4, 5].every((d) => days.includes(d)) &&
            days.every((d) => d >= 1 && d <= 5)
          ? " on weekdays"
          : ` on ${days.map((d) => names[d]).join(", ")}`;
    return n === 1 ? `Weekly${dayPart}` : `Every ${n} weeks${dayPart}`;
  }
  return n === 1 ? "Monthly" : `Every ${n} months`;
}
