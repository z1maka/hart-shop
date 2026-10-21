// Text from a form or the database going into an HTML email. Every value a
// visitor typed passes through here, or the notification becomes theirs to
// write: a link or markup in a message field would render as the shop's own.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
