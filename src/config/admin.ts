// The product list lets the admin pick how much to see at once; the first
// size is the default, which links leave out of the address.
export const ADMIN_PRODUCT_PAGE_SIZES = [25, 50, 100] as const
export const ADMIN_PRODUCTS_PER_PAGE: number = ADMIN_PRODUCT_PAGE_SIZES[0]
export const ADMIN_ORDERS_PER_PAGE = 30
export const ADMIN_ENQUIRIES_PER_PAGE = 30
