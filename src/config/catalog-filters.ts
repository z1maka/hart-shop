// The catalogue lists and the query parameters that only narrow or reorder
// them. Each combination repeats a plain list, and colour sets alone run to
// millions of addresses: from 20.10.2026 GPTBot fetched ~160k of them a day and
// every one queried the database. Crawlers are kept out (src/app/robots.ts)
// and told noindex (next.config.ts); plain ?page= stays open.
//
// Product pages are deliberately not here: the Merchant feed and the ads link
// to /product/<slug>/?color=<colour>, which Google has to keep crawling.
export const CATALOG_LIST_PATHS: readonly string[] = ['/shop/', '/product-category/']

export const CATALOG_FILTER_PARAMS: readonly string[] = ['color', 'weight', 'sort', 'pages']
