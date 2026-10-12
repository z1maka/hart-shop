const WINDOW_MS = 60_000
const MAX_ATTEMPTS_PER_WINDOW = 10
const MAX_TRACKED_KEYS = 10_000

type Window = { readonly startedAt: number; count: number }

const windows = new Map<string, Window>()

// A per-instance fixed window. On serverless this resets when the instance is
// recycled, which is acceptable: its job is to stop bursts from one address
// cheaply, while the durable per-account lockout in the database stops the
// slow, patient attacker.
export function isLoginThrottled(key: string): boolean {
  const now = Date.now()
  const current = windows.get(key)

  if (!current || now - current.startedAt >= WINDOW_MS) {
    if (windows.size >= MAX_TRACKED_KEYS) windows.clear()
    windows.set(key, { startedAt: now, count: 1 })
    return false
  }

  current.count += 1
  return current.count > MAX_ATTEMPTS_PER_WINDOW
}
