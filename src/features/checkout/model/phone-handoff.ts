// The quick-order panel hands a typed phone over to the full checkout through
// sessionStorage: a URL parameter would leak personal data into the browser
// history and server logs.
export const PHONE_HANDOFF_KEY = 'hart_checkout_phone'
