import { emptyState } from "../storage";
import type { AppState } from "../types";
import { encryptState } from "./crypto";
import { syncAppState } from "./engine";

const config = {
  url: "https://abcd.supabase.co",
  anonKey: "eyJtest",
};

function taskState(title: string, updatedAt: string): AppState {
  const state = emptyState();
  state.onboarded = true;
  state.updatedAt = updatedAt;
  state.tasks.push({
    id: "t1",
    title,
    notes: "",
    area: "systems",
    startDate: "2026-09-16",
    recurrence: null,
    createdAt: updatedAt,
  });
  return state;
}

describe("sync engine", () => {
  const passphrase = "unit-test-passphrase";

  it("seeds the cloud when local has tasks and remote is empty", async () => {
    const local = taskState("Local only", "2026-09-16T12:00:00.000Z");
    const fetchFn: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("today_get_blob")) {
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain("today_put_blob");
      const body = JSON.parse(String(init?.body));
      expect(body.blob_ciphertext).not.toContain("Local only");
      expect(body.blob_id).toMatch(/^[0-9a-f]{64}$/);
      return new Response(
        JSON.stringify([
          {
            id: body.blob_id,
            ciphertext: body.blob_ciphertext,
            updated_at: body.blob_updated_at,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const result = await syncAppState({ local, passphrase, config, fetchFn });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.action).toBe("seeded");
  });

  it("pulls a newer remote blob", async () => {
    const local = taskState("Stale phone", "2026-09-16T10:00:00.000Z");
    const remote = taskState("Work PC", "2026-09-16T12:00:00.000Z");
    const ciphertext = await encryptState(remote, passphrase);

    const fetchFn: typeof fetch = async (input) => {
      const url = String(input);
      expect(url).toContain("today_get_blob");
      return new Response(
        JSON.stringify([{ id: "x", ciphertext, updated_at: remote.updatedAt }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const result = await syncAppState({ local, passphrase, config, fetchFn });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("pulled");
      expect(result.state.tasks[0].title).toBe("Work PC");
    }
  });

  it("does not upload an empty never-edited device", async () => {
    const fetchFn: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("today_put_blob")) {
        throw new Error("should not put");
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const result = await syncAppState({
      local: emptyState(),
      passphrase,
      config,
      fetchFn,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.action).toBe("unchanged");
  });

  it("surfaces a missing-migration 404", async () => {
    const fetchFn: typeof fetch = async () => new Response("not found", { status: 404 });
    const result = await syncAppState({
      local: taskState("x", "2026-09-16T12:00:00.000Z"),
      passphrase,
      config,
      fetchFn,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/001_today_blobs/i);
  });
});
