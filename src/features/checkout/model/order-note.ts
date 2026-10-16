// What the buyer adds to an order in their own words: the size they are
// between, when to call, how to pack. Room for a few sentences, short enough
// to read whole in the shop's Telegram card.
export const ORDER_NOTE_MAX_LENGTH = 500

// A note of spaces and line breaks is no note: the order keeps null, so the
// admin and the notifications show nothing rather than an empty line.
export function normalizeOrderNote(value: string | undefined): string | null {
  const note = value?.trim() ?? ''
  return note === '' ? null : note
}
