import { getTranslations } from 'next-intl/server'
import type { FaqEntry, StoryBlock } from '@/features/catalog/model/category-content'

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
      {story.map((block, index) => (
        <StoryBlockView key={index} block={block} />
      ))}

      {faq.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-h3 font-bold text-ink">{t('faqTitle')}</h2>
          <div className="grid gap-2.5">
            {faq.map((entry, index) => (
              <details
                key={index}
                className="group rounded-card border border-subtle bg-surface px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink marker:hidden">
                  {entry.question}
                </summary>
                <p className="mt-2.5 text-[14.5px] leading-relaxed whitespace-pre-line text-muted">
                  {entry.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function StoryBlockView({ block }: { readonly block: StoryBlock }) {
  if (block.type === 'heading') {
    return <h2 className="mt-8 mb-3 font-display text-h3 font-bold text-ink">{block.text}</h2>
  }
  if (block.type === 'list') {
    return (
      <ul className="mb-4 grid gap-1.5 pl-5 text-[15px] leading-relaxed text-muted">
        {block.items.map((item, index) => (
          <li key={index} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    )
  }
  return <p className="mb-4 text-[15px] leading-relaxed text-pretty text-muted">{block.text}</p>
}
