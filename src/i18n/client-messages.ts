type MessageTree = { readonly [key: string]: unknown }

// The texts the browser needs: every namespace a component reads through the
// useTranslations hook, which is how client components get their words.
// Server code translates on the server and sends finished strings, so the
// rest, the legal pages and the checkout return screen among them, stays out
// of the payload every page carried in full. A unit test keeps this list in
// step with the hook calls in src/.
export const CLIENT_MESSAGE_NAMESPACES = [
  'addToCart',
  'cart',
  'checkout',
  'colors',
  'compareUi',
  'consent',
  'contact.form',
  'customOrderPage.form',
  'filters',
  'gallery',
  'menu',
  'miniCart',
  'nav',
  'orderTimeline',
  'pagination',
  'pdp',
  'privacyPage.consent',
  'product',
  'rail',
  'reviews',
  'search',
  'sizeGuide',
] as const

export function pickClientMessages(messages: MessageTree): MessageTree {
  return CLIENT_MESSAGE_NAMESPACES.reduce<MessageTree>(
    (picked, namespace) => withBranch(picked, namespace.split('.'), messages),
    {},
  )
}

function withBranch(target: MessageTree, path: readonly string[], source: MessageTree): MessageTree {
  const [head, ...rest] = path
  if (head === undefined) return target

  const branch = source[head]

  if (rest.length === 0 || !isTree(branch)) return { ...target, [head]: branch }

  const current = target[head]
  return { ...target, [head]: withBranch(isTree(current) ? current : {}, rest, branch) }
}

function isTree(value: unknown): value is MessageTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
