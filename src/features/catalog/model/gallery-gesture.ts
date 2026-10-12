// How far a finger has to travel sideways before a swipe turns the slide;
// shorter than that it was a tap, or a wobble while scrolling the page.
const SWIPE_MIN_DISTANCE_PX = 40
// A mouse that moved less than this between press and release clicked.
const DRAG_MIN_DISTANCE_PX = 5

export type SlideStep = -1 | 0 | 1

// A swipe to the left brings the next slide, to the right the previous one.
// Mostly vertical movement is the page scrolling under the finger.
export function swipeStep(deltaX: number, deltaY: number): SlideStep {
  if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE_PX) return 0
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return 0

  return deltaX < 0 ? 1 : -1
}

export function isDrag(deltaX: number): boolean {
  return Math.abs(deltaX) >= DRAG_MIN_DISTANCE_PX
}
