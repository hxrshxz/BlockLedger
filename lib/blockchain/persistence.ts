/**
 * Typed, versioned, SSR-safe localStorage.
 *
 * Every key lives under `blockledger.v1.*`. Corrupt JSON, a version bump or a
 * failing schema check resets that key to its default instead of throwing —
 * a judge reloading the demo must never see a white screen.
 */

const NAMESPACE = "blockledger.v1";

export const StorageKeys = {
  identities: `${NAMESPACE}.identities`,
  assets: `${NAMESPACE}.assets`,
  auditChain: `${NAMESPACE}.audit.chain`,
  tokenSequence: `${NAMESPACE}.assets.sequence`,
  seeded: `${NAMESPACE}.seeded`,
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

interface Envelope<T> {
  v: 1;
  data: T;
  savedAt: number;
}

function getStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Storage can throw in hardened / third-party-cookie-blocked contexts.
    return null;
  }
}

export function isStorageAvailable(): boolean {
  return getStore() !== null;
}

/**
 * Reads `key`, falling back to `fallback` when absent, unparseable, of the
 * wrong version, or rejected by `validate`.
 */
export function readState<T>(
  key: StorageKey,
  fallback: T,
  validate?: (value: unknown) => value is T
): T {
  const store = getStore();
  if (!store) return fallback;

  let raw: string | null;
  try {
    raw = store.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<Envelope<T>>;
    if (!parsed || parsed.v !== 1 || !("data" in parsed)) {
      removeState(key);
      return fallback;
    }
    const data = parsed.data as T;
    if (validate && !validate(data)) {
      removeState(key);
      return fallback;
    }
    return data;
  } catch {
    console.warn(`[blockledger] corrupt state at ${key}; resetting`);
    removeState(key);
    return fallback;
  }
}

/** Returns false when the write was dropped (SSR, quota exceeded, locked). */
export function writeState<T>(key: StorageKey, data: T): boolean {
  const store = getStore();
  if (!store) return false;

  const envelope: Envelope<T> = { v: 1, data, savedAt: Date.now() };
  try {
    store.setItem(key, JSON.stringify(envelope));
    return true;
  } catch (error) {
    const name =
      error instanceof Error ? error.name : String(error ?? "unknown");
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
      console.warn(
        `[blockledger] localStorage quota exceeded writing ${key}; state kept in memory only`
      );
    } else {
      console.warn(`[blockledger] failed to persist ${key}:`, error);
    }
    return false;
  }
}

export function removeState(key: StorageKey): void {
  const store = getStore();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Wipes every BlockLedger key — used by the "reset demo" control. */
export function clearAllState(): void {
  const store = getStore();
  if (!store) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && key.startsWith(NAMESPACE)) doomed.push(key);
    }
    doomed.forEach((key) => store.removeItem(key));
  } catch {
    /* ignore */
  }
}

/** Narrow helper used as a `validate` argument for array-shaped state. */
export function isArrayOf<T>(
  guard: (item: unknown) => boolean
): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] =>
    Array.isArray(value) && value.every(guard);
}

export function isRecordLike(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
