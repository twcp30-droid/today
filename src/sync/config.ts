export type SyncConfig = {
  url: string;
  anonKey: string;
};

const PLACEHOLDER = /YOUR_|changeme|example\.com|your-anon|placeholder/i;

export function readSyncConfig(
  env: Pick<ImportMetaEnv, "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"> = import.meta.env,
): SyncConfig | null {
  const url = String(env.VITE_SUPABASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) return null;
  if (PLACEHOLDER.test(url) || PLACEHOLDER.test(anonKey)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { url, anonKey };
}

export function isSyncConfigured(
  env?: Pick<ImportMetaEnv, "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY">,
): boolean {
  return readSyncConfig(env) !== null;
}
