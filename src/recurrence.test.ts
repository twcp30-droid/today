import { addDays, addMonths } from "./date";
import { occursOn } from "./recurrence";
import type { Recurrence } from "./types";

describe("occursOn — one-shot", () => {
  it("matches only the start date", () => {
    expect(occursOn("2026-09-16", null, "2026-09-16")).toBe(true);
    expect(occursOn("2026-09-16", null, "2026-09-17")).toBe(false);
    expect(occursOn("2026-09-16", null, "2026-09-15")).toBe(false);
  });
});

describe("occursOn — daily", () => {
  const daily: Recurrence = { frequency: "daily", interval: 1 };

  it("repeats every day from start", () => {
    expect(occursOn("2026-09-16", daily, "2026-09-16")).toBe(true);
    expect(occursOn("2026-09-16", daily, "2026-09-17")).toBe(true);
    expect(occursOn("2026-09-16", daily, "2026-10-01")).toBe(true);
    expect(occursOn("2026-09-16", daily, "2026-09-15")).toBe(false);
  });

  it("honors interval", () => {
    const every3: Recurrence = { frequency: "daily", interval: 3 };
    expect(occursOn("2026-09-16", every3, "2026-09-16")).toBe(true);
    expect(occursOn("2026-09-16", every3, "2026-09-17")).toBe(false);
    expect(occursOn("2026-09-16", every3, "2026-09-19")).toBe(true);
  });
});

describe("occursOn — weekly", () => {
  it("uses the start weekday when weekdays are omitted", () => {
    // 2026-09-16 is a Wednesday
    const weekly: Recurrence = { frequency: "weekly", interval: 1 };
    expect(occursOn("2026-09-16", weekly, "2026-09-16")).toBe(true);
    expect(occursOn("2026-09-16", weekly, "2026-09-23")).toBe(true);
    expect(occursOn("2026-09-16", weekly, "2026-09-17")).toBe(false);
  });

  it("matches selected weekdays", () => {
    const weekdays: Recurrence = {
      frequency: "weekly",
      interval: 1,
      weekdays: [1, 3, 5],
    };
    expect(occursOn("2026-09-16", weekdays, "2026-09-16")).toBe(true); // Wed
    expect(occursOn("2026-09-16", weekdays, "2026-09-18")).toBe(true); // Fri
    expect(occursOn("2026-09-16", weekdays, "2026-09-21")).toBe(true); // Mon
    expect(occursOn("2026-09-16", weekdays, "2026-09-17")).toBe(false); // Thu
  });

  it("does not match days before the series starts even if weekday matches", () => {
    const weekdays: Recurrence = {
      frequency: "weekly",
      interval: 1,
      weekdays: [1, 3, 5],
    };
    expect(occursOn("2026-09-16", weekdays, "2026-09-14")).toBe(false); // prior Mon
  });
});

describe("occursOn — monthly", () => {
  it("repeats on the same calendar day", () => {
    const monthly: Recurrence = { frequency: "monthly", interval: 1 };
    expect(occursOn("2026-01-15", monthly, "2026-01-15")).toBe(true);
    expect(occursOn("2026-01-15", monthly, "2026-02-15")).toBe(true);
    expect(occursOn("2026-01-15", monthly, "2026-02-14")).toBe(false);
  });

  it("clamps month-end dates (Jan 31 → Feb 28 2026)", () => {
    const monthly: Recurrence = { frequency: "monthly", interval: 1 };
    expect(occursOn("2026-01-31", monthly, "2026-01-31")).toBe(true);
    expect(occursOn("2026-01-31", monthly, "2026-02-28")).toBe(true);
    expect(occursOn("2026-01-31", monthly, "2026-02-31")).toBe(false);
    expect(occursOn("2026-01-31", monthly, "2026-03-31")).toBe(true);
  });
});

describe("date helpers used by recurrence", () => {
  it("addDays and addMonths stay in local civil time", () => {
    expect(addDays("2026-09-16", 1)).toBe("2026-09-17");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 2)).toBe("2026-03-31");
  });
});
