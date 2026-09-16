import { emptyState } from "../storage";
import { blobIdFromPassphrase, decryptState, encryptState, normalizePassphrase } from "./crypto";

describe("passphrase crypto", () => {
  const passphrase = "correct horse battery staple";

  it("normalizes unicode and trim", () => {
    expect(normalizePassphrase("  Café  ")).toBe("Café");
    expect(normalizePassphrase("\u2126")).toBe("Ω");
  });

  it("derives a stable 64-char blob id", async () => {
    const a = await blobIdFromPassphrase(` ${passphrase} `);
    const b = await blobIdFromPassphrase(passphrase);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(await blobIdFromPassphrase("different phrase"));
  });

  it("round-trips app state without putting plaintext in the envelope", async () => {
    const state = emptyState();
    state.onboarded = true;
    state.updatedAt = "2026-09-16T12:00:00.000Z";
    state.tasks.push({
      id: "t1",
      title: "SECRET_SCADA_WALKDOWN",
      notes: "unit 4",
      area: "scada",
      startDate: "2026-09-16",
      recurrence: { frequency: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5] },
      createdAt: "2026-09-16T12:00:00.000Z",
    });
    state.mits["2026-09-16"] = ["t1"];
    state.completions["t1::2026-09-16"] = "2026-09-16T15:00:00.000Z";

    const envelope = await encryptState(state, passphrase);
    expect(envelope).not.toContain("SECRET_SCADA_WALKDOWN");
    expect(envelope).not.toContain("scada");
    expect(JSON.stringify(state)).toContain("SECRET_SCADA_WALKDOWN");

    const roundTrip = await decryptState(envelope, passphrase);
    expect(roundTrip.tasks[0].title).toBe("SECRET_SCADA_WALKDOWN");
    expect(roundTrip.mits["2026-09-16"]).toEqual(["t1"]);
    expect(roundTrip.completions["t1::2026-09-16"]).toBe("2026-09-16T15:00:00.000Z");
  });

  it("rejects the wrong passphrase", async () => {
    const envelope = await encryptState(emptyState(), passphrase);
    await expect(decryptState(envelope, "wrong passphrase")).rejects.toThrow(/Wrong passphrase/);
  });
});
