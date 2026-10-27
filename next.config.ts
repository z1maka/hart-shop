import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'
import { z } from 'zod'

const PRIVATE_HOST_PATTERN = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|10\.|192\.168\.)/

const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL
const mediaOrigin = mediaUrl ? new URL(mediaUrl) : null

// Next blocks image upstreams that resolve to a private IP. The storage host is
// MinIO on the loopback locally and R2 in production, so the exemption follows
// the env value instead of an environment flag.
const isPrivateMediaHost = mediaOrigin ? PRIVATE_HOST_PATTERN.test(mediaOrigin.hostname) : false

const isProduction = process.env.NODE_ENV === 'production'

// GA4 beacons leave through www.google-analytics.com, the regional
// collectors under it, analytics.google.com and the doubleclick stats host;
// a transport the policy does not list is a lost pageview, not a console
// warning only.
const GOOGLE_HOSTS =
  'https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://stats.g.doubleclick.net'
// The Ads conversion side of gtag: conversion beacons go to googleadservices
// and doubleclick, consent-mode pings to google.com and its country domain.
// Without these the conversion still leaves through the surviving transport,
// but every fallback lands in the console as a CSP violation.
const GOOGLE_ADS_HOSTS =
  'https://www.googleadservices.com https://googleads.g.doubleclick.net https://ad.doubleclick.net https://www.google.com https://google.com https://www.google.com.ua https://pagead2.googlesyndication.com'
const META_HOSTS = 'https://connect.facebook.net https://www.facebook.com'
// Clarity loads its tag from www.clarity.ms and reports to regional *.clarity.ms
// collectors, so the wildcard is the documented allowance, not a shortcut.
const CLARITY_HOSTS = 'https://www.clarity.ms https://*.clarity.ms'
// Clarity's documented cookie-sync pixel; images only.
const CLARITY_SYNC_HOSTS = 'https://c.bing.com'
// TikTok serves the pixel SDK and receives its events from the same host; its
// IPv6 enrichment call goes to a second one, and without it every page load
// logs a CSP violation.
const TIKTOK_HOSTS = 'https://analytics.tiktok.com https://analytics-ipv6.tiktokw.us'
// Google Customer Reviews: platform.js and its modules come from apis.google.com,
// the survey offer itself is a www.google.com frame on the order page.
const GOOGLE_REVIEWS_SCRIPT_HOSTS = 'https://apis.google.com'
const GOOGLE_REVIEWS_FRAME_HOSTS = 'https://www.google.com'

// Analytics load only after consent, but the policy has to allow them upfront —
// a blocked script after the banner is accepted looks like a broken banner.
const contentSecurityPolicy = [
  "default-src 'self'",
  // React's development build needs eval() for its debugging features; the
  // production build never calls it.
  `script-src 'self' 'unsafe-inline' ${isProduction ? '' : "'unsafe-eval'"} ${GOOGLE_HOSTS} ${GOOGLE_ADS_HOSTS} ${META_HOSTS} ${CLARITY_HOSTS} ${TIKTOK_HOSTS} ${GOOGLE_REVIEWS_SCRIPT_HOSTS}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaOrigin?.origin ?? ''} ${GOOGLE_HOSTS} ${GOOGLE_ADS_HOSTS} ${META_HOSTS} ${CLARITY_HOSTS} ${CLARITY_SYNC_HOSTS} ${TIKTOK_HOSTS}`,
  "font-src 'self' data:",
  `connect-src 'self' ${mediaOrigin?.origin ?? ''} ${GOOGLE_HOSTS} ${GOOGLE_ADS_HOSTS} ${META_HOSTS} ${CLARITY_HOSTS} ${TIKTOK_HOSTS}`,
  // The shop's own product videos stream from the media bucket.
  `media-src 'self' ${mediaOrigin?.origin ?? ''}`,
  // YouTube videos play in its privacy-enhanced player.
  `frame-src 'self' https://www.facebook.com https://www.youtube-nocookie.com ${GOOGLE_REVIEWS_FRAME_HOSTS}`,
  "object-src 'none'",
  "base-uri 'self'",
  // The Meta pixel posts larger events (a purchase with items) through a
  // hidden form; with 'self' alone the browser blocks that post and the
  // event never reaches Meta.
  "form-action 'self' https://www.facebook.com",
  "frame-ancestors 'none'",
  // Locally the storage host is plain http on the loopback; upgrading those
  // requests would break every image in development.
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

// Until the shop opens, every response says noindex as well: robots.txt only
// stops crawling, and a blocked URL linked from elsewhere can still be listed.
// Parsed the way src/lib/env.ts reads the same variable.
const isIndexable = z.stringbool().default(false).parse(process.env.SITE_INDEXABLE)
const CLOSED_SITE_HEADERS = isIndexable ? [] : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]

// Product slugs WordPress renamed before the migration. WordPress kept
// answering the old ones with a redirect, Search Console still crawls them
// (seen 03–04.10.2026), and the new site would answer 404. Old → current.
const RENAMED_WORDPRESS_PRODUCT_SLUGS: Readonly<Record<string, string>> = {
  'оригінал-usa-активні-навушники-walkers-razor-tacti-grip-electronic-muff':
    'aktyvni-navushnyky-walkers-razor-tacti-grip',
  'sholom-kaska-kevlarova-3a-sestan-busch-bk-ach-hc-oryhinal-nato-chokhol':
    'sholom-sestan-busch-bk-ach-hc-multykam',
  'sholom-kaska-kevlarova-3a-sestan-busch-bk-ach-hc-oryhinal-nato-chokhol-1':
    'sholom-sestan-busch-bk-ach-hc-olyva',
  'sholom-kaska-kevlarova-3a-sestan-busch-helmet-bk-ach-gen-ii-oryhinal-nato-z-chokhlom':
    'sholom-sestan-busch-bk-ach-gen-ii-koiot',
  'sholom-kaska-kevlarova-3a-sestan-busch-helmet-bk-ach-gen-ii-oryhinal-nato-z-chokhlom-1':
    'sholom-sestan-busch-bk-ach-gen-ii-olyva',
  'komplekt-sholom-kaska-kevlarova-3a-sestan-busch-bk-ach-hc-oryhinal-nato-navushnyky-walkers-razor':
    'komplekt-sholom-kevlar-3a-sestan-busch-bk-ach-hc-oryhinal-navushnyky-walkers-razor',
  'komplekt-sholom-kaska-kevlarova-3a-sestan-busch-bk-ach-hc-oryhinal-nato-aktyvni-navushnyky-walkers-razor':
    'komplekt-sholom-sestan-busch-bk-ach-hc-i-navushnyky-walkers-razor',
  'komplekt-sholom-kaska-kevlarova-3a-fast-nij0106-01-iiia-3a-oryhinal-aktyvni-navushnyky-walkers-razor':
    'komplekt-sholom-fast-iiia-i-navushnyky-walkers-razor',
}

// Slugs this shop changed after launch, Cyrillic ones moved to Latin on the
// owner's request (20.10.2026). Each change ships with its redirect here
// (AGENTS.md §1), every old slug pointing straight at the current one. The
// «Avenger» card turned out to be the Acasom ROC-6 cover (owner, 20.10.2026).
// Slugs that named FOX Armor's «Predator» model, read in English or named
// the wrong colour or antenna now say what the card sells (owner, 22.10.2026);
// cards in the Google feed kept theirs. The same day the pixel tent became the
// multicam one and the khaki tent the olive one. Bought-in gear, the
// stretchers, T-shirts and the MOLLE poncho lost their «-1», «oryhinal-usa»
// and «molle-molle» tails on 27.10.2026; cards in the Google feed or in ads
// again kept theirs. Old → current.
const RENAMED_PRODUCT_SLUGS: Readonly<Record<string, string>> = {
  'чохол-антитепловізор-та-антидрон-для-2': 'antyteploviziynyi-chokhol-na-acasom-roc-6',
  'antyteploviziynyi-chokhol-na-antenu-avenger': 'antyteploviziynyi-chokhol-na-acasom-roc-6',
  'antydron-poncho-predator-class-a-uv-em-zakhyst': 'antydronove-poncho-uv-em',
  'antydron-poncho-predator-class-c-uv-em-zakhyst': 'antydronova-nakydka-uv-em-z-rukavamy',
  'chokhly-nakydni-predator-dlya-ruk-uv-em-zakhyst': 'antyteploviziyni-chokhly-na-ruky-uv-em',
  'chokhly-ponozhni-predator-dlya-nih-uv-em-zakhyst': 'antyteploviziyni-chokhly-na-nohy-uv-em',
  'copy-case-anti-thermal-vision-and-anti-dr': 'antyteploviziynyi-chokhol-na-starlink-mini',
  'чохол-антитепловізор-та-антидрон-для': 'antyteploviziynyi-chokhol-na-antenu-adaptis',
  'anty-teploviziynyy-tent-multi-a6286-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor':
    'antyteploviziynyi-tent-250x150-multykam',
  'antyteploviziynyi-tent-250x150-piksel': 'antyteploviziynyi-tent-250x150-multykam',
  'antyteploviziynyi-tent-250x150-khaki': 'antyteploviziynyi-tent-250x150-olyva',
  'anty-teploviziyne-odeyalo-zakhysna-nakydka-vid-droniv-zakhyshchaye-vid-teploviziynoho-sposterezhennya':
    'antyteploviziyna-kovdra-z-molle',
  'aktyvni-navushnyky-walkers-razor-oryhinal-usa-oryhinal':
    'aktyvni-navushnyky-walkers-razor-siryi-kamufliazh',
  'aktyvni-navushnyky-walkers-razor-oryhinal-usa-oryhinal-1':
    'aktyvni-navushnyky-walkers-razor-pisochnyi-kamufliazh',
  'aktyvni-navushnyky-walkers-razor-oryhinal-usa-oryhinal-2':
    'aktyvni-navushnyky-walkers-razor-zelenyi-kamufliazh',
  'oryhinal-usa-aktyvni-navushnyky-walkers-razor-tacti-grip-electronic-muff':
    'aktyvni-navushnyky-walkers-razor-tacti-grip',
  'komplekt-aktyvnykh-navushnykiv-walkers-razor-z-balistychnymy-okulyaramy-glasses-combo-kit-oryhinal-usa-oryhinal':
    'komplekt-walkers-razor-z-balistychnymy-okuliaramy',
  'komplekt-oryhinalnyy-aktyvni-navushnyky-walkers-razor-usa-z-povorotnymy-kriplennyamy':
    'komplekt-walkers-razor-z-kriplenniamy-arc',
  'komplekt-sholom-kevlar-3a-fast-nij0106-01-iiia-3a-oryhinal-aktyvni-navushnyky-walkers-razor':
    'komplekt-sholom-fast-iiia-i-navushnyky-walkers-razor',
  'komplekt-sholom-kevlar-3a-sestan-busch-bk-ach-hc-oryhinal-aktyvni-navushnyky-walkers-razor':
    'komplekt-sholom-sestan-busch-bk-ach-hc-i-navushnyky-walkers-razor',
  'sholom-kevlar-3a-sestan-busch-bk-ach-hc-oryhinal-chokhol':
    'sholom-sestan-busch-bk-ach-hc-multykam',
  'sholom-kevlar-3a-sestan-busch-bk-ach-hc-oryhinal-chokhol-1':
    'sholom-sestan-busch-bk-ach-hc-olyva',
  'sholom-kevlar-3a-sestan-busch-helmet-bk-ach-gen-ii-oryhinal-z-chokhlom':
    'sholom-sestan-busch-bk-ach-gen-ii-koiot',
  'sholom-kevlar-3a-sestan-busch-helmet-bk-ach-gen-ii-oryhinal-z-chokhlom-1':
    'sholom-sestan-busch-bk-ach-gen-ii-olyva',
  'taktychnyy-ryukzak-mil-tec-40l-oryhinal-nimechchyna': 'ryukzak-mil-tec-40-l-multykam',
  'taktychnyy-ryukzak-mil-tec-40l-oryhinal-nimechchyna-1': 'ryukzak-mil-tec-40-l-koiot',
  'taktychnyy-ryukzak-mil-tec-40l-oryhinal-nimechchyna-2': 'ryukzak-mil-tec-40-l-siryi-piksel',
  'noshi-taktychni-medychni-evakuatsiyni-savior-z-hnuchkym-armovanym-karkasom': 'noshi-savior-siri',
  'noshi-taktychni-medychni-evakuatsiyni-savior-z-hnuchkym-armovanym-karkasom-2':
    'noshi-savior-olyva',
  'futbolka-taktychna-coolmax': 'futbolka-coolmax-piksel-i-olyva',
  'futbolka-taktychna-coolmax-1': 'futbolka-coolmax-odnotonna',
  'poncho-z-posylenym-zakhystom-vid-teplovizoriv-ta-droniv-model-fx-2-iz-dodatkovymy-kriplennyamy-elementiv-maskuvannya-molle-molle-anty-teplovizor-poncho':
    'antydronove-poncho-z-molle-4-shary',
}

// Products folded into another card: the old page moves to where its variants
// are sold now. The Gen 3 cover became the «Gen 3 / Gen 4» choice of the
// Gen 2–4 card (owner, 20.10.2026). The archived multicam tent's colour is
// sold on the former pixel tent's card (owner, 22.10.2026). Old → current.
const MERGED_PRODUCT_SLUGS: Readonly<Record<string, string>> = {
  'chokhol-antiteplovizor-i-antidron-dlya-starlinka-starlink-gen-3':
    'chekhol-antiteplovizor-i-antidron-dlya-starlink',
  'anty-teploviziynyy-tent-multi-vt-6370-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor':
    'antyteploviziynyi-tent-250x150-multykam',
}

// A Cyrillic slug arrives percent-encoded, and redirects match the raw path.
// Categories renamed after launch: every address is Latin (owner, 22.10.2026),
// and a Cyrillic one also broke the redirects that pointed at it. Old → current.
const RENAMED_CATEGORY_SLUGS: Readonly<Record<string, string>> = {
  'чохли-для-starlink': 'chokhly-dlya-starlink',
}

function categoryRedirects(slugs: Readonly<Record<string, string>>) {
  return Object.entries(slugs).map(([oldSlug, currentSlug]) => ({
    source: `/product-category/${encodeURIComponent(oldSlug)}`,
    destination: `/product-category/${currentSlug}/`,
    permanent: true,
  }))
}

function productRedirects(slugs: Readonly<Record<string, string>>) {
  return Object.entries(slugs).map(([oldSlug, currentSlug]) => ({
    source: `/product/${encodeURIComponent(oldSlug)}`,
    destination: `/product/${currentSlug}/`,
    permanent: true,
  }))
}

const nextConfig: NextConfig = {
  // Baked into both bundles at build time: an admin form carries it, and a
  // save from a tab opened before a deploy is refused with «перезагрузите
  // страницу» instead of a field error about something the tab never had.
  env: { APP_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' },
  // Every indexed WordPress URL ends with a slash; the canonical structure
  // survives the migration only if the new site keeps that shape (AGENTS.md §1).
  trailingSlash: true,
  async headers() {
    return [{ source: '/:path*', headers: [...SECURITY_HEADERS, ...CLOSED_SITE_HEADERS] }]
  },
  async redirects() {
    // WordPress service pages that are deliberately not reproduced. Targets are
    // fixed by docs/MIGRATION.md; permanent so search engines carry the equity.
    return [
      { source: '/my-account', destination: '/', permanent: true },
      { source: '/wishlist-page', destination: '/shop/', permanent: true },
      // Both WP tag archives are empty blog leftovers with no product links.
      { source: '/tag/:slug*', destination: '/shop/', permanent: true },
      // Technical pages of the WP theme builder, indexed by accident.
      { source: '/layouts/:slug*', destination: '/', permanent: true },
      // The WP "uncategorized" bucket: its products live in the anti-drone
      // category here, so the indexed URL follows them. The source is
      // percent-encoded because redirects match the raw request path.
      {
        source:
          '/product-category/%D0%B1%D0%B5%D0%B7-%D0%BA%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D1%96%D1%97',
        destination: '/product-category/anti-dronovi-nakidki/',
        permanent: true,
      },
      // WP paginates as /page/N/; the catalog paginates with a query param.
      { source: '/shop/page/:page(\\d+)', destination: '/shop/?page=:page', permanent: true },
      {
        source: '/product-category/:slug/page/:page(\\d+)',
        destination: '/product-category/:slug/?page=:page',
        permanent: true,
      },
      ...categoryRedirects(RENAMED_CATEGORY_SLUGS),
      ...productRedirects(RENAMED_WORDPRESS_PRODUCT_SLUGS),
      ...productRedirects(RENAMED_PRODUCT_SLUGS),
      ...productRedirects(MERGED_PRODUCT_SLUGS),
    ]
  },
  async rewrites() {
    // Search Console knows the WP sitemap address; both must answer (MIGRATION §5).
    return [{ source: '/sitemap_index.xml', destination: '/sitemap.xml' }]
  },
  cacheComponents: true,
  // Product photos are uploaded through a Server Action, and the default cap is
  // 1MB. Vercel itself refuses a body over 4.5MB, so this is the ceiling: the
  // browser downscales anything larger before it is sent.
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } },
  partialPrefetching: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowLocalIP: isPrivateMediaHost,
    remotePatterns: [
      ...(mediaOrigin
        ? [
            {
              protocol: mediaOrigin.protocol.replace(':', '') as 'http' | 'https',
              hostname: mediaOrigin.hostname,
              port: mediaOrigin.port,
            },
          ]
        : []),
      // Product video thumbnails, served through the image optimizer so the
      // page's own origin is the only image host the browser talks to.
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
    ],
  },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
