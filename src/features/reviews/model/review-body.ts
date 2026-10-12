// Long enough to say something about the product; short enough to read on a
// phone. Shared by the schema and by the form, which counts down to the
// minimum in the browser, so they live apart from the Zod contract.
export const MIN_BODY_LENGTH = 20
export const MAX_BODY_LENGTH = 2000
