import { COMPANY } from '@/config/company'
import { HEADER_CHANNELS } from '@/config/contact'
import { DISPATCH_DAYS, shippingRateCentsFor, TRANSIT_DAYS } from '@/config/delivery'
import { siteConfig } from '@/config/site'
import { enquiryRecipient, env } from '@/lib/env'
import { Currency, decimalAmount, type Money } from '@/lib/money'

type JsonLdNode = Record<string, unknown>

const SCHEMA_CONTEXT = 'https://schema.org'
const IN_STOCK = 'https://schema.org/InStock'
const OUT_OF_STOCK = 'https://schema.org/OutOfStock'

export function absoluteUrl(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL).toString()
}

// Sewing since 2014 in Mykolaiv; the channel is the only public profile
// the workshop keeps, the messenger handles are phone numbers, not pages.
const FOUNDING_YEAR = '2014'
const WORKSHOP_CITY = 'Миколаїв'

export function organizationJsonLd(): JsonLdNode {
  const youtube = HEADER_CHANNELS.find((channel) => channel.key === 'youtube')

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Organization',
    name: siteConfig.name,
    legalName: COMPANY.legalName,
    url: absoluteUrl('/'),
    description: siteConfig.description,
    logo: absoluteUrl('/icon.png'),
    email: enquiryRecipient,
    telephone: COMPANY.phone,
    foundingDate: FOUNDING_YEAR,
    address: { '@type': 'PostalAddress', addressLocality: WORKSHOP_CITY, addressCountry: 'UA' },
    areaServed: 'UA',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: COMPANY.phone,
        contactType: 'sales',
        availableLanguage: ['uk'],
      },
    ],
    ...(youtube ? { sameAs: [youtube.href] } : {}),
  }
}

export function websiteJsonLd(): JsonLdNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    name: siteConfig.name,
    url: absoluteUrl('/'),
    inLanguage: siteConfig.locale,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl('/shop/?q={search_term_string}'),
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export type ProductJsonLdInput = {
  readonly slug: string
  readonly title: string
  readonly description: string
  readonly sku: string
  readonly price: Money
  // The parcel weight Merchant Center prices delivery by.
  readonly weightGrams: number
  readonly imageUrls: readonly string[]
  readonly inStock: boolean
  readonly colors: readonly string[]
  readonly rating: { readonly average: number; readonly count: number } | null
  readonly reviews: readonly {
    readonly author: string
    readonly rating: number
    readonly body: string
    readonly date: string
  }[]
}

const BEST_RATING = 5

export function productJsonLd(input: ProductJsonLdInput): JsonLdNode {
  // With the trailing slash the canonical URL carries: a shopping engine
  // comparing the offer with the page should not land on a redirect.
  const url = absoluteUrl(`/product/${input.slug}/`)

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Product',
    name: input.title,
    description: input.description,
    sku: input.sku,
    url,
    image: [...input.imageUrls],
    brand: { '@type': 'Brand', name: siteConfig.name },
    countryOfOrigin: 'UA',
    ...(input.colors.length > 0 ? { color: input.colors.join(', ') } : {}),
    // What Search Console asked for on every product (25.09.2026): the
    // rating and the reviews, once there are any.
    ...(input.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: input.rating.average,
            reviewCount: input.rating.count,
            bestRating: BEST_RATING,
          },
        }
      : {}),
    ...(input.reviews.length > 0
      ? {
          review: input.reviews.map((review) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: review.author },
            datePublished: review.date,
            reviewBody: review.body,
            reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: BEST_RATING },
          })),
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: input.price.currency,
      price: decimalAmount(input.price.amountCents),
      availability: input.inStock ? IN_STOCK : OUT_OF_STOCK,
      itemCondition: 'https://schema.org/NewCondition',
      // What the refund policy page promises: 14 days, sent back by mail, the
      // shop paying the return shipping — the same terms as the Merchant
      // Center return policy (owner's decision, 25.09.2026).
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'UA',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: shippingDetailsJsonLd(input.weightGrams),
    },
  }
}

// Where, how fast and for how much. The buyer pays the carrier on receipt;
// the rate is the one Merchant Center states for a parcel of this weight,
// which Search Console asked for on every offer (30.09.2026). A product
// nobody has weighed states no rate: Merchant Center cannot price it either.
function shippingDetailsJsonLd(weightGrams: number): JsonLdNode {
  const rateCents = shippingRateCentsFor(weightGrams)

  return {
    '@type': 'OfferShippingDetails',
    ...(rateCents === null
      ? {}
      : {
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: decimalAmount(rateCents),
            currency: Currency.Uah,
          },
        }),
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'UA' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: daysJsonLd(DISPATCH_DAYS),
      transitTime: daysJsonLd(TRANSIT_DAYS),
    },
  }
}

function daysJsonLd(days: { readonly min: number; readonly max: number }): JsonLdNode {
  return { '@type': 'QuantitativeValue', minValue: days.min, maxValue: days.max, unitCode: 'DAY' }
}

export type VideoJsonLdInput = {
  readonly name: string
  readonly description: string
  readonly thumbnailUrl: string
  // ISO 8601 date-time and duration.
  readonly uploadDate: string
  readonly duration: string
  readonly embedUrl: string
}

// A video as Google's video results read it: name, thumbnail and upload date
// are required, the length and the player are recommended.
export function videoJsonLd(input: VideoJsonLdInput): JsonLdNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'VideoObject',
    name: input.name,
    description: input.description,
    thumbnailUrl: [input.thumbnailUrl],
    uploadDate: input.uploadDate,
    duration: input.duration,
    embedUrl: input.embedUrl,
  }
}

export function breadcrumbJsonLd(trail: readonly { name: string; path: string }[]): JsonLdNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  }
}

export function itemListJsonLd(
  listName: string,
  items: readonly { name: string; path: string }[],
): JsonLdNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  }
}

export type ArticleJsonLdInput = {
  readonly headline: string
  readonly description: string
  readonly path: string
  readonly publishedAt: string
  readonly updatedAt: string
}

// Google's Article result wants an image and a publisher logo as an
// ImageObject; the site's Open Graph card stands in for guides without a
// picture of their own.
const ARTICLE_IMAGE_PATH = '/opengraph-image'

export function articleJsonLd(input: ArticleJsonLdInput): JsonLdNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    inLanguage: 'uk',
    image: [absoluteUrl(ARTICLE_IMAGE_PATH)],
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: input.publishedAt,
    dateModified: input.updatedAt,
    author: { '@type': 'Organization', name: siteConfig.name, url: absoluteUrl('/') },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/icon.png') },
    },
  }
}

export function faqJsonLd(entries: readonly { question: string; answer: string }[]): JsonLdNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  }
}
