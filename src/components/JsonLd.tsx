type JsonLdProps = {
  readonly data: Record<string, unknown> | readonly Record<string, unknown>[]
}

// The payload carries buyers' words too — review bodies and names go into
// the product node — so the "<" escaping is load-bearing: it is what keeps a
// "</script>" inside a review from closing the tag early. Never drop it.
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
