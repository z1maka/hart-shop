const MAX_TRACKED_KEYS = 10_000

type Window = { readonly startedAt: number; count: number }

export type FixedWindowLimiter = (key: string) => boolean

// Per-instance fixed window, same trade-off as the admin login throttle: it
// stops cheap bursts from one address, while anything durable (a captcha, a
// paid WAF) waits until real abuse shows up. Instances recycle, counters reset,
// and that is acceptable for a public form.
export function createFixedWindowLimiter(options: {
  readonly windowMs: number
  readonly maxPerWindow: number
}): FixedWindowLimiter {
  const windows = new Map<string, Window>()

  return function isThrottled(key: string): boolean {
    const now = Date.now()
    const current = windows.get(key)

    if (!current || now - current.startedAt >= options.windowMs) {
      if (windows.size >= MAX_TRACKED_KEYS) windows.clear()
      windows.set(key, { startedAt: now, count: 1 })
      return false
    }

    current.count += 1
    return current.count > options.maxPerWindow
  }
}
