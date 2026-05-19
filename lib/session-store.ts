// Tracks the single active session — a new login invalidates any previous one.
// Stored on globalThis so HMR module re-evaluations don't clear it.
const g = globalThis as typeof globalThis & { __ntSessionId?: string | null }
if (!('__ntSessionId' in g)) g.__ntSessionId = null

export function registerSession(id: string): void {
    g.__ntSessionId = id
}

export function isActiveSession(id: string): boolean {
    return g.__ntSessionId === id
}
