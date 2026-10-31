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
