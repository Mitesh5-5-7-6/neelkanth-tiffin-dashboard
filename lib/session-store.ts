// Tracks active sessions. Stored on globalThis so HMR re-evaluations don't clear it.
// Uses a Set so multiple concurrent sessions across clients are supported.
const g = globalThis as typeof globalThis & {
  __ntActiveSessionIds?: Set<string>;
};
if (!("__ntActiveSessionIds" in g)) g.__ntActiveSessionIds = new Set();

export function registerSession(id: string): void {
  g.__ntActiveSessionIds!.add(id);
}

export function isActiveSession(id: string): boolean {
  return g.__ntActiveSessionIds!.has(id);
}
