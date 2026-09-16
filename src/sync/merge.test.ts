import { emptyState } from "../storage";
import { decideWinner } from "./merge";

describe("last-write-wins", () => {
  it("lets remote win when it is newer", () => {
    const local = { ...emptyState(), updatedAt: "2026-09-16T10:00:00.000Z" };
    const remote = { ...emptyState(), updatedAt: "2026-09-16T11:00:00.000Z" };
    expect(decideWinner(local, remote)).toBe("remote");
  });

  it("lets local win when it is newer", () => {
    const local = { ...emptyState(), updatedAt: "2026-09-16T12:00:00.000Z" };
    const remote = { ...emptyState(), updatedAt: "2026-09-16T11:00:00.000Z" };
    expect(decideWinner(local, remote)).toBe("local");
  });

  it("treats a fresh device (no updatedAt) as losing to cloud data", () => {
    expect(decideWinner(emptyState(), { ...emptyState(), updatedAt: "2026-09-16T11:00:00.000Z" })).toBe(
      "remote",
    );
  });

  it("is equal when timestamps match", () => {
    const ts = "2026-09-16T11:00:00.000Z";
    expect(decideWinner({ ...emptyState(), updatedAt: ts }, { ...emptyState(), updatedAt: ts })).toBe(
      "equal",
    );
  });
});
