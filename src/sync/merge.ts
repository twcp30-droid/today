import { stateTimestamp } from "../storage";
import type { AppState } from "../types";

export type MergeDecision = "local" | "remote" | "equal";

/**
 * Whole-document last-write-wins using AppState.updatedAt.
 * Missing timestamps lose to any real write so a fresh device pulls existing cloud data.
 */
export function decideWinner(local: AppState, remote: AppState): MergeDecision {
  const localTs = stateTimestamp(local);
  const remoteTs = stateTimestamp(remote);
  if (remoteTs > localTs) return "remote";
  if (localTs > remoteTs) return "local";
  return "equal";
}

export function serverTimeMs(updatedAt: string): number {
  const value = Date.parse(updatedAt);
  return Number.isNaN(value) ? 0 : value;
}
