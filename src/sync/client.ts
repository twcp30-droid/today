import type { SyncConfig } from "./config";

export type RemoteBlob = {
  id: string;
  ciphertext: string;
  updated_at: string;
};

export class SyncNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncNetworkError";
  }
}

export async function getRemoteBlob(
  config: SyncConfig,
  blobId: string,
  fetchFn: typeof fetch = fetch,
): Promise<RemoteBlob | null> {
  const rows = await rpc<RemoteBlob[]>(config, "today_get_blob", { blob_id: blobId }, fetchFn);
  return rows[0] ?? null;
}

export async function putRemoteBlob(
  config: SyncConfig,
  blob: { id: string; ciphertext: string; updatedAt: string },
  fetchFn: typeof fetch = fetch,
): Promise<RemoteBlob> {
  const rows = await rpc<RemoteBlob[]>(
    config,
    "today_put_blob",
    {
      blob_id: blob.id,
      blob_ciphertext: blob.ciphertext,
      blob_updated_at: blob.updatedAt,
    },
    fetchFn,
  );
  const stored = rows[0];
  if (!stored) throw new SyncNetworkError("Cloud did not store the encrypted blob");
  return stored;
}

async function rpc<T>(
  config: SyncConfig,
  fn: string,
  args: Record<string, string>,
  fetchFn: typeof fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchFn(`${config.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
  } catch {
    throw new SyncNetworkError("Could not reach Supabase. Check the URL and your network.");
  }

  if (response.status === 404) {
    throw new SyncNetworkError(
      "Sync RPC missing. Run supabase/migrations/001_today_blobs.sql in the Supabase SQL editor.",
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new SyncNetworkError("Supabase rejected the anon key. Check VITE_SUPABASE_ANON_KEY.");
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new SyncNetworkError(body.trim() || `Supabase error ${response.status}`);
  }

  return (await response.json()) as T;
}
