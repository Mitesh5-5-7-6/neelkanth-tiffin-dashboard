// Tracks the single active session — a new login invalidates any previous one.
// This is a module-level singleton; it lives as long as the Node.js process.
let currentSessionId: string | null = null;

export function registerSession(id: string): void {
    currentSessionId = id;
}

export function isActiveSession(id: string): boolean {
    return currentSessionId === id;
}
