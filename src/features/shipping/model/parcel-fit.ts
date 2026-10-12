const GRAMS_PER_KILO = 1000

// Nova Poshta states a point's limit either per place (a branch taking any
// number of boxes up to 30 kg each) or in total (a locker cell, a mini
// branch). A zero means "not stated"; with neither stated the point is not
// limited as far as we can tell.
export function receivingLimitGrams(placeMaxKg: number, totalMaxKg: number): number | null {
  if (placeMaxKg > 0) return placeMaxKg * GRAMS_PER_KILO
  if (totalMaxKg > 0) return totalMaxKg * GRAMS_PER_KILO
  return null
}
