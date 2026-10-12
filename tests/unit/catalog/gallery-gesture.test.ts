import { describe, expect, it } from 'vitest'
import { isDrag, swipeStep } from '@/features/catalog/model/gallery-gesture'

describe('gallery swipe', () => {
  it('turns to the next slide on a swipe to the left and back on a swipe to the right', () => {
    expect(swipeStep(-120, 10)).toBe(1)
    expect(swipeStep(120, -10)).toBe(-1)
  })

  it('ignores a tap and a short wobble', () => {
    expect(swipeStep(0, 0)).toBe(0)
    expect(swipeStep(-25, 0)).toBe(0)
  })

  it('leaves mostly vertical movement to the page scroll', () => {
    expect(swipeStep(-60, 140)).toBe(0)
  })
})

describe('thumbnail drag', () => {
  it('treats a few pixels of travel as a click', () => {
    expect(isDrag(3)).toBe(false)
    expect(isDrag(-4)).toBe(false)
  })

  it('treats longer travel as a drag either way', () => {
    expect(isDrag(12)).toBe(true)
    expect(isDrag(-30)).toBe(true)
  })
})
