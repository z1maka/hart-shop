// Nothing scheduled runs at night on Kyiv's clock (owner, 26.09.2026): no
// message reaches a buyer or the team's chats between these hours, and the
// silent jobs wait for the morning as well. Vercel schedules crons in UTC
// and knows nothing of the clock change, so the hour is checked in code.
export const QUIET_HOURS_FROM = 23
export const QUIET_HOURS_TO = 8
