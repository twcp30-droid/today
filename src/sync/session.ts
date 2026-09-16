const PASSPHRASE_KEY = "today-app:sync-passphrase";
const LAST_SYNC_KEY = "today-app:last-sync";

export type LastSync = {
  at: string;
  detail: string;
};

export function loadPassphrase(storage: Pick<Storage, "getItem"> = localStorage): string {
  try {
    return storage.getItem(PASSPHRASE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePassphrase(
  passphrase: string,
  storage: Pick<Storage, "setItem" | "removeItem"> = localStorage,
): void {
  if (!passphrase) {
    storage.removeItem(PASSPHRASE_KEY);
    return;
  }
  storage.setItem(PASSPHRASE_KEY, passphrase);
}

export function forgetPassphrase(
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  storage.removeItem(PASSPHRASE_KEY);
}

export function loadLastSync(storage: Pick<Storage, "getItem"> = localStorage): LastSync | null {
  try {
    const raw = storage.getItem(LAST_SYNC_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as LastSync).at !== "string" ||
      typeof (parsed as LastSync).detail !== "string"
    ) {
      return null;
    }
    return parsed as LastSync;
  } catch {
    return null;
  }
}

export function saveLastSync(
  value: LastSync,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(LAST_SYNC_KEY, JSON.stringify(value));
}
