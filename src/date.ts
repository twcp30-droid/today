const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  if (!ISO_DATE.test(iso)) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(iso: string, months: number): string {
  const d = parseISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = lastDateOfMonth(d);
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

export function lastDateOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function startOfMonth(iso: string): string {
  const d = parseISODate(iso);
  d.setDate(1);
  return toISODate(d);
}

export function diffDays(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / 86_400_000);
}

export function monthLabel(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function longDateLabel(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function shortDateLabel(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function weekdayOf(iso: string): number {
  return parseISODate(iso).getDay();
}

/** Sunday-start month grid including leading/trailing days. */
export function monthGrid(iso: string): string[] {
  const first = parseISODate(startOfMonth(iso));
  const startOffset = first.getDay();
  const days: string[] = [];
  for (let i = -startOffset; i < 42 - startOffset; i += 1) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    days.push(toISODate(d));
  }
  return days;
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function isWeekend(iso: string): boolean {
  const day = weekdayOf(iso);
  return day === 0 || day === 6;
}
