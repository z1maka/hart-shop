const GRAMS_PER_KILO = 1000

// A parcel's weight in kilos as people read it — "2,5", no trailing zeros —
// in the language of the screen or chat that shows it.
export function formatKilos(grams: number, locale: string, maximumFractionDigits = 1): string {
  return (grams / GRAMS_PER_KILO).toLocaleString(locale, { maximumFractionDigits })
}
