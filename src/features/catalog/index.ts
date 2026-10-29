export {
  getCatalogSitemap,
  type CatalogSitemap,
  type SitemapEntry,
} from '@/features/catalog/queries/get-sitemap-entries'
export { getCategories, type CategoryView } from '@/features/catalog/queries/get-categories'
export {
  categoryManagementService,
  type CategoryDraft,
  type CategoryVisibility,
  type VisibilityChange,
} from '@/features/catalog/services/category-management'
export {
  CATALOG_PAGE_SIZE,
  getCatalogPage,
  getFeaturedProducts,
  getCompanionProducts,
  getCartCompanions,
  type CatalogPage,
  type CatalogQuery,
} from '@/features/catalog/queries/get-products'
export { getCategoryCounts } from '@/features/catalog/queries/get-category-counts'
export { getColorFacets } from '@/features/catalog/queries/get-color-facets'
export { getCategoryCover } from '@/features/catalog/queries/get-category-covers'
export { getColorLinks } from '@/features/catalog/queries/get-color-links'
export {
  getProductBySlug,
  getPublishedProductSlugs,
  type ProductDetailView,
  type WholesaleView,
  type SpecRowView,
} from '@/features/catalog/queries/get-product'
export { getArchivedProductDestination } from '@/features/catalog/queries/get-archived-product-destination'
export {
  coverIndexByColor,
  type ProductCardView,
  type ProductImageView,
  type ProductVariantView,
} from '@/features/catalog/model/product-view'
export type {
  CatalogSort,
  CatalogWeightBand,
} from '@/features/catalog/repository/product-repository'
export { ProductCard } from '@/features/catalog/ui/ProductCard'
export { ProductGrid } from '@/features/catalog/ui/ProductGrid'
export {
  CatalogSidebar,
  type CategoryFilterOption,
  type ColorFilterOption,
  type FilterOption,
} from '@/features/catalog/ui/CatalogSidebar'
export { ProductGallery } from '@/features/catalog/ui/ProductGallery'
export { GalleryVideoControlProvider } from '@/features/catalog/ui/GalleryVideoControl'
export { WatchVideoButton } from '@/features/catalog/ui/WatchVideoButton'
export { ProductRail } from './ui/ProductRail'
export { FaqList } from '@/features/catalog/ui/FaqList'
export { getProductCover } from './queries/get-category-covers'
export {
  getMerchantFeedXml,
  getMerchantOfferIdLookup,
  getMetaCatalogXml,
  getPartnerFeedYml,
} from '@/features/catalog/queries/get-merchant-feed'
