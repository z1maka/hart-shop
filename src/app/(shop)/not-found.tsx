import { NotFoundPanel, type NotFoundLink } from '@/components/layout/NotFoundPanel'
import { getCategories } from '@/features/catalog'
import { getTranslations } from 'next-intl/server'

export default async function ShopNotFound() {
  const categories = await getCategories()
  const t = await getTranslations('nav')

  const links: NotFoundLink[] = [
    { href: '/shop/', label: t('allProducts') },
    ...categories.map((category) => ({
      href: `/product-category/${category.slug}/`,
      label: category.name,
    })),
    { href: '/delivery/', label: t('delivery') },
    { href: '/about-us/', label: t('aboutUs') },
  ]

  return <NotFoundPanel links={links} />
}
