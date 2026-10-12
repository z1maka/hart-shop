import type { FaqEntry } from '@/features/catalog/model/category-content'

// Questions buyers ask, each opening to its answer: the same on a category
// page and a product page.
export function FaqList({ entries }: { readonly entries: readonly FaqEntry[] }) {
  return (
    <div className="grid gap-2.5">
      {entries.map((entry, index) => (
        <details key={index} className="group rounded-card border border-subtle bg-surface px-5 py-4">
          <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink marker:hidden">
            {entry.question}
          </summary>
          <p className="mt-2.5 text-[14.5px] leading-relaxed whitespace-pre-line text-muted">
            {entry.answer}
          </p>
        </details>
      ))}
    </div>
  )
}
