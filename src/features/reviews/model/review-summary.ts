export const MIN_RATING = 1
export const MAX_RATING = 5

const RATINGS_HIGH_TO_LOW = [5, 4, 3, 2, 1] as const
const AVERAGE_PRECISION = 10

export type RatingBucket = {
  readonly rating: number
  readonly count: number
}

export type ReviewSummary = {
  readonly count: number
  // Rounded to one decimal, as the page prints it; 0 when nothing is rated.
  readonly average: number
  // From five stars down, the way the bars are drawn.
  readonly histogram: readonly RatingBucket[]
}

export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING
}

export function summarizeRatings(ratings: readonly number[]): ReviewSummary {
  const valid = ratings.filter(isValidRating)
  const count = valid.length
  const total = valid.reduce((sum, rating) => sum + rating, 0)
  const average = count === 0 ? 0 : Math.round((total / count) * AVERAGE_PRECISION) / AVERAGE_PRECISION

  return {
    count,
    average,
    histogram: RATINGS_HIGH_TO_LOW.map((rating) => ({
      rating,
      count: valid.filter((value) => value === rating).length,
    })),
  }
}

// «4,7»: the decimal comma of the Ukrainian storefront.
export function formatAverage(average: number): string {
  return average.toFixed(1).replace('.', ',')
}
