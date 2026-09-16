import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState } from "../types";
import { readSyncConfig } from "./config";
import { syncAppState } from "./engine";
import {
  forgetPassphrase,
  loadLastSync,
  loadPassphrase,
  saveLastSync,
  savePassphrase,
} from "./session";

export type SyncStatus = {
  configured: boolean;
  passphraseSaved: boolean;
  syncing: boolean;
  lastSynced: string | null;
  detail: string | null;
  error: string | null;
};

export function useSync(
  state: AppState,
  setState: (updater: AppState | ((current: AppState) => AppState)) => void,
) {
  const configured = readSyncConfig() !== null;
  const [passphrase, setPassphraseValue] = useState(() => loadPassphrase());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(() => loadLastSync()?.at ?? null);
  const [detail, setDetail] = useState<string | null>(() => loadLastSync()?.detail ?? null);
  const skipAutoPush = useRef(true);
  const inFlight = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const passphraseRef = useRef(passphrase);
  passphraseRef.current = passphrase;

  const persistPassphrase = useCallback((value: string) => {
    setPassphraseValue(value);
    savePassphrase(value);
  }, []);

  const forget = useCallback(() => {
    forgetPassphrase();
    setPassphraseValue("");
    setError(null);
    setDetail("Passphrase removed from this device. Tasks stay in localStorage.");
  }, []);

  const runSync = useCallback(async (reason: "manual" | "auto") => {
    const config = readSyncConfig();
    if (!config) {
      if (reason === "manual") {
        setError("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild (see README).");
      }
      return;
    }
    const phrase = passphraseRef.current;
    if (!phrase) {
      if (reason === "manual") setError("Set the same passphrase on each device first.");
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setSyncing(true);
    if (reason === "manual") setError(null);

    try {
      const result = await syncAppState({
        local: stateRef.current,
        passphrase: phrase,
        config,
      });
      if (!result.ok) {
        setError(result.error);
        setDetail(null);
        return;
      }
      if (result.action === "pulled") {
        skipAutoPush.current = true;
        setState(result.state);
      }
      const at = new Date().toISOString();
      setLastSynced(at);
      setDetail(result.detail);
      setError(null);
      saveLastSync({ at, detail: result.detail });
    } finally {
      inFlight.current = false;
      setSyncing(false);
    }
  }, [setState]);

  useEffect(() => {
    if (!configured || !passphrase) return;
    void runSync("auto");
  }, [configured, passphrase, runSync]);

  useEffect(() => {
    if (skipAutoPush.current) {
      skipAutoPush.current = false;
      return;
    }
    if (!configured || !passphrase || !state.updatedAt) return;
    const timer = window.setTimeout(() => {
      void runSync("auto");
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [configured, passphrase, runSync, state.updatedAt]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void runSync("auto");
    }
    function onOnline() {
      void runSync("auto");
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [runSync]);

  const status: SyncStatus = {
    configured,
    passphraseSaved: Boolean(passphrase),
    syncing,
    lastSynced,
    detail,
    error,
  };

  return {
    passphrase,
    persistPassphrase,
    forget,
    runSync,
    status,
  };
}
