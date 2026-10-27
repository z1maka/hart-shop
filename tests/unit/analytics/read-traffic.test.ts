import { beforeEach, describe, expect, it, vi } from 'vitest'

const jar = vi.hoisted(() => new Map<string, string>())

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
  }),
}))

import { serializeTouch } from '@/features/analytics/model/traffic-source'
import { readGoogleClickId, readTrafficTouch } from '@/features/analytics/session'

const TOUCH = { source: 'google_ads', detail: 'PMax' } as const

beforeEach(() => {
  jar.clear()
})

describe('readTrafficTouch at checkout', () => {
  it('names the channel the shopper came from', async () => {
    jar.set('hart_source', serializeTouch(TOUCH))

    await expect(readTrafficTouch()).resolves.toEqual(TOUCH)
  })

  it('drops it once the shopper has refused tracking', async () => {
    jar.set('hart_source', serializeTouch(TOUCH))
    jar.set('hart_consent', 'denied')

    await expect(readTrafficTouch()).resolves.toBeNull()
  })

  it('is null without a recorded visit', async () => {
    await expect(readTrafficTouch()).resolves.toBeNull()
  })
})

describe('readGoogleClickId at checkout', () => {
  const GCLID = 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk'

  it('hands the ad click to the order', async () => {
    jar.set('hart_gclid', GCLID)

    await expect(readGoogleClickId()).resolves.toBe(GCLID)
  })

  it('drops it once the shopper has refused tracking', async () => {
    jar.set('hart_gclid', GCLID)
    jar.set('hart_consent', 'denied')

    await expect(readGoogleClickId()).resolves.toBeNull()
  })
})
