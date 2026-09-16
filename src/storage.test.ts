import { emptyState, loadState, parseImportedState, saveState, STORAGE_KEY } from "./storage";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("storage round-trip", () => {
  it("returns empty state when nothing is saved", () => {
    expect(loadState(new MemoryStorage())).toEqual(emptyState());
  });

  it("persists tasks, completions, MITs, and skips", () => {
    const mem = new MemoryStorage();
    const state = emptyState();
    state.onboarded = true;
    state.tasks.push({
      id: "t1",
      title: "Walkdown",
      notes: "",
      area: "scada",
      startDate: "2026-09-16",
      recurrence: { frequency: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5] },
      createdAt: "2026-09-16T12:00:00.000Z",
    });
    state.completions["t1::2026-09-16"] = "2026-09-16T15:00:00.000Z";
    state.mits["2026-09-16"] = ["t1"];
    state.skipped["t1::2026-09-17"] = true;

    saveState(state, mem);
    expect(mem.getItem(STORAGE_KEY)).toContain("Walkdown");
    expect(loadState(mem)).toEqual(state);
  });

  it("drops malformed records on import", () => {
    const imported = parseImportedState(
      JSON.stringify({
        version: 1,
        tasks: [{ id: "ok", title: "A", area: "me", startDate: "2026-01-01" }, { title: "nope" }],
        completions: { "ok::2026-01-01": "ts", bad: 1 },
        skipped: { "ok::2026-01-02": true, nope: false },
        mits: { "2026-01-01": ["ok"], bad: "nope" },
        onboarded: 1,
      }),
    );
    expect(imported.tasks).toHaveLength(1);
    expect(imported.completions).toEqual({ "ok::2026-01-01": "ts" });
    expect(imported.skipped).toEqual({ "ok::2026-01-02": true });
    expect(imported.mits).toEqual({ "2026-01-01": ["ok"] });
    expect(imported.onboarded).toBe(true);
  });
});
