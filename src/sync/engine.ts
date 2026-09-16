import { stateTimestamp, touchState } from "../storage";
import type { AppState } from "../types";
import { getRemoteBlob, putRemoteBlob, SyncNetworkError } from "./client";
import type { SyncConfig } from "./config";
import { blobIdFromPassphrase, CryptoError, decryptState, encryptState } from "./crypto";
import { decideWinner, serverTimeMs } from "./merge";

export type SyncAction = "pulled" | "pushed" | "unchanged" | "seeded";

export type SyncSuccess = {
  ok: true;
  state: AppState;
  action: SyncAction;
  detail: string;
};

export type SyncFailure = {
  ok: false;
  error: string;
};

export type SyncOutcome = SyncSuccess | SyncFailure;

export async function syncAppState(options: {
  local: AppState;
  passphrase: string;
  config: SyncConfig;
  fetchFn?: typeof fetch;
}): Promise<SyncOutcome> {
  const fetchFn = options.fetchFn ?? fetch;
  let blobId: string;
  try {
    blobId = await blobIdFromPassphrase(options.passphrase);
  } catch (error) {
    return fail(error);
  }

  let remote;
  try {
    remote = await getRemoteBlob(options.config, blobId, fetchFn);
  } catch (error) {
    return fail(error);
  }

  if (!remote) {
    if (stateTimestamp(options.local) === 0 && options.local.tasks.length === 0) {
      return {
        ok: true,
        state: options.local,
        action: "unchanged",
        detail: "No cloud data yet. Add a task, then Sync now to create the encrypted blob.",
      };
    }
    return push(options.local, options.passphrase, blobId, options.config, fetchFn, "seeded");
  }

  let remoteState: AppState;
  try {
    remoteState = await decryptState(remote.ciphertext, options.passphrase);
  } catch (error) {
    return fail(error);
  }
  if (!remoteState.updatedAt) {
    remoteState = {
      ...remoteState,
      updatedAt: new Date(serverTimeMs(remote.updated_at) || 0).toISOString(),
    };
  }

  const winner = decideWinner(options.local, remoteState);
  if (winner === "remote") {
    return {
      ok: true,
      state: remoteState,
      action: "pulled",
      detail: "Loaded newer tasks from the other device.",
    };
  }
  if (winner === "equal") {
    return {
      ok: true,
      state: options.local,
      action: "unchanged",
      detail: "Already in sync.",
    };
  }

  return push(options.local, options.passphrase, blobId, options.config, fetchFn, "pushed");
}

async function push(
  local: AppState,
  passphrase: string,
  blobId: string,
  config: SyncConfig,
  fetchFn: typeof fetch,
  action: "pushed" | "seeded",
): Promise<SyncOutcome> {
  const stamped = local.updatedAt ? local : touchState(local);
  let ciphertext: string;
  try {
    ciphertext = await encryptState(stamped, passphrase);
  } catch (error) {
    return fail(error);
  }

  let stored;
  try {
    stored = await putRemoteBlob(
      config,
      { id: blobId, ciphertext, updatedAt: stamped.updatedAt! },
      fetchFn,
    );
  } catch (error) {
    return fail(error);
  }

  if (serverTimeMs(stored.updated_at) > stateTimestamp(stamped)) {
    try {
      const newer = await decryptState(stored.ciphertext, passphrase);
      return {
        ok: true,
        state: newer,
        action: "pulled",
        detail: "The other device wrote first. Loaded that copy.",
      };
    } catch (error) {
      return fail(error);
    }
  }

  return {
    ok: true,
    state: stamped,
    action,
    detail: action === "seeded" ? "Uploaded this device’s tasks." : "Uploaded newer tasks from this device.",
  };
}

function fail(error: unknown): SyncFailure {
  if (error instanceof CryptoError || error instanceof SyncNetworkError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Error && error.message) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Sync failed" };
}
