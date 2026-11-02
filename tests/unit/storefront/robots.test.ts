import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'https://hart-shop.com', SITE_INDEXABLE: true },
}))

import robots from '@/app/robots'

function disallowedPatterns(): string[] {
  const { rules } = robots()
  const [rule] = Array.isArray(rules) ? rules : [rules]
  const disallow = rule?.disallow ?? []
  return Array.isArray(disallow) ? disallow : [disallow]
}

// robots.txt matching as Google reads it: a prefix match where * is any run.
function isDisallowed(url: string): boolean {
  return disallowedPatterns().some((pattern) => {
    const source = pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')
    return new RegExp(`^${source}`).test(url)
  })
}

describe('robots', () => {
  it('keeps crawlers out of filtered and re-sorted catalogue lists', () => {
    expect(isDisallowed('/shop/?color=Олива,Хакі')).toBe(true)
    expect(isDisallowed('/product-category/noshi/?page=2&color=Олива')).toBe(true)
    expect(isDisallowed('/product-category/ryukzaki/?sort=price-asc')).toBe(true)
    expect(isDisallowed('/shop/?weight=light')).toBe(true)
    expect(isDisallowed('/shop/?page=1&pages=3')).toBe(true)
  })

  it('leaves plain lists, their pages and ad-tagged visits open', () => {
    expect(isDisallowed('/shop/')).toBe(false)
    expect(isDisallowed('/shop/?page=2')).toBe(false)
    expect(isDisallowed('/product-category/chokhly-dlya-starlink/?gclid=abc')).toBe(false)
  })

  // The Merchant feed and the ads open a colour on the product page itself.
  it('leaves product pages with a colour open', () => {
    expect(isDisallowed('/product/antyteploviziyne-poncho-3-shary/?color=Олива')).toBe(false)
  })
})
