import { getAdminCategories, getCatalogFacets } from '@/features/admin/queries/get-admin-catalog'
import { CatalogTab, CatalogTabs } from '@/features/admin/ui/CatalogTabs'
import { CategoryTable } from '@/features/admin/ui/CategoryTable'
import { NewCategoryPanel } from '@/features/admin/ui/NewCategoryPanel'
import { RefreshStorefront } from '@/features/admin/ui/RefreshStorefront'

// The categories tab: the header menu's order, visibility and names.
export async function CategoriesCatalog() {
  const [categories, facets] = await Promise.all([getAdminCategories(), getCatalogFacets()])
  // Any change on the server — a new name, a hidden category — gives the
  // table a fresh start. The order alone does not: the table already holds
  // the order it saved, and starting over would drop the focus from the
  // handle a keyboard user is moving.
  const version = categories
    .map((category) =>
      [category.slug, category.name, category.isVisible, category.published, category.drafts].join(
        ':',
      ),
    )
    .toSorted()
    .join('|')

  return (
    <>
      <CatalogTabs
        active={CatalogTab.Categories}
        productCount={facets.live}
        categoryCount={categories.length}
        actions={
          <>
            <RefreshStorefront />
            <NewCategoryPanel nextPosition={categories.length + 1} />
          </>
        }
      />

      <div className="mb-4 rounded-card border border-alert-edge bg-alert-soft px-4.5 py-4">
        <p className="mb-1.5 text-[13.5px] font-semibold text-alert">Скрыть — не значит удалить</p>
        <p className="max-w-[80ch] text-[13px] leading-relaxed text-alert">
          Скрытая категория сразу уходит из хедера, фильтров каталога и поиска, её товары становятся
          недоступны — прямые ссылки отдают 404. В уже оформленных заказах позиции и счета
          сохраняются. Из базы ничего не удаляется.
        </p>
      </div>

      <p className="mb-3 text-[12.5px] text-muted">
        Порядок в списке задаёт порядок в хедере — перетаскивайте за ручку слева.
      </p>

      <CategoryTable key={version} categories={categories} />
    </>
  )
}
