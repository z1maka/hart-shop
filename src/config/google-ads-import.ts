// The shop's sales go to Google Ads from the server as well as from the
// browser tag: Google Ads fetches /api/google-ads/conversions.csv on a schedule
// (Tools → Data Manager → HTTPS, which refuses a URL without a .csv or .tsv
// ending) and books each order on the ad click it came from. Owner's decision
// (27.10.2026): about a third of the ad sales never reached Ads through the tag.
export const GOOGLE_ADS_IMPORT = {
  // Must match the import conversion action in the Ads account letter for letter.
  conversionName: 'Server purchase',
  // The scheduler logs in with this name and GOOGLE_ADS_IMPORT_PASSWORD.
  username: 'google-ads',
  // Each fetch repeats the last days, as Google asks: a click too fresh for
  // one run is booked by the next, and a row already booked is skipped as a
  // duplicate.
  lookbackDays: 3,
} as const

// The same sales pushed hourly through the Data Manager API
// (lib/google-data-manager.ts, cron /api/cron/google-ads-sales/), so smart
// bidding learns of a sale hours sooner than from the daily fetch above,
// which stays as the safety net. The window of each run assumes the cron
// fires every hour outside the quiet hours: vercel.json must keep it hourly
// (a test holds the two together).
export const GOOGLE_ADS_PUSH = {
  // Google refuses a sale whose ad click is younger than six hours («retry
  // after 6 hours have passed»). An order is never older than its click, so
  // one placed this long ago is safe to report.
  delayHours: 6,
  // Each run reaches a little further back than where the previous one
  // stopped, so a late cron run leaves no gap. A sale that arrives twice is
  // matched by its order number and only restated, never counted again.
  overlapMinutes: 30,
} as const
