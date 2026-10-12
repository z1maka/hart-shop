import { getTranslations } from 'next-intl/server'
import type { FaqEntry, StoryBlock } from '@/features/catalog/model/category-content'
import { FaqList } from '@/features/catalog/ui/FaqList'
import { ReadingBlocks } from '@/features/catalog/ui/ReadingBlocks'

type CategoryStoryProps = {
  readonly story: readonly StoryBlock[]
  readonly faq: readonly FaqEntry[]
}

// The long read under the grid: how to choose, how the fabric works, what
// buyers ask. Written in the admin, printed as plain reading text.
export async function CategoryStory({ story, faq }: CategoryStoryProps) {
  const t = await getTranslations('categoryStory')

  return (
    <section className="mt-14">
      <ReadingBlocks blocks={story} />

      {faq.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-h3 font-bold text-ink">{t('faqTitle')}</h2>
          <FaqList entries={faq} />
        </div>
      ) : null}
    </section>
  )
}
