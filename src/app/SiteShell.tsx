import { Suspense } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header, HeaderPlaceholder } from '@/components/layout/Header'
import { ImageGuard } from '@/components/layout/ImageGuard'
import { TopBar } from '@/components/layout/TopBar'
import { getCartItemCount } from '@/features/cart'
import { AnalyticsScripts, ConsentBanner, TrafficSourceTracker } from '@/features/analytics'
import { MiniCart } from '@/features/cart/ui/MiniCart'
import { getCategories } from '@/features/catalog'
import { env } from '@/lib/env'
import { SearchDialog } from '@/features/catalog/ui/SearchDialog'
import { searchProducts } from '@/features/catalog/queries/search-products'
import { getTranslations } from 'next-intl/server'

// Header, footer, consent and analytics around any page: the shop and the
// content segment share one shell and differ only in what they put inside.
export function SiteShell({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <TopBar />
      <Suspense fallback={<HeaderPlaceholder />}>
        <ShopHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
      <ImageGuard />
      <MiniCart />
      <ConsentBanner />
      <TrafficSourceTracker />
      <AnalyticsScripts
        ids={{
          gaMeasurementId: env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? null,
          googleAdsId: env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? null,
          googleAdsConversionLabel: env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL ?? null,
          isGoogleAdsInGoogleTag: env.NEXT_PUBLIC_GOOGLE_ADS_IN_GOOGLE_TAG,
          metaPixelId: env.NEXT_PUBLIC_META_PIXEL_ID ?? null,
          tiktokPixelId: env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? null,
          clarityProjectId: env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? null,
        }}
      />
      <Suspense fallback={<div className="h-64 bg-footer" />}>
        <ShopFooter />
      </Suspense>
    </div>
  )
}

async function ShopHeader() {
  const [categories, cartCount, popular, searchT] = await Promise.all([
    getCategories(),
    getCartItemCount(),
    searchProducts(''),
    getTranslations('search'),
  ])

  return (
    <Header
      categories={categories}
      cartCount={cartCount}
      search={
        <SearchDialog
          suggestions={searchT.raw('suggestions') as readonly string[]}
          initialResults={popular}
        />
      }
    />
  )
}

async function ShopFooter() {
  const categories = await getCategories()
  return <Footer categories={categories} />
}
