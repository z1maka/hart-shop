import { getTranslations } from 'next-intl/server'
import type { CardSizeChoice } from '@/features/catalog/model/product-view'

// The models a card's product is cut to, as quiet tags beside the colours:
// they tell the buyer the cover fits their dish before the page is opened,
// and the choice itself stays on the page.
export async function CardSizeLabels({ choice }: { readonly choice: CardSizeChoice }) {
  const t = await getTranslations('addToCart')

  return (
    <ul aria-label={t(choice.axis)} className="flex flex-wrap gap-1">
      {choice.sizes.map((size) => (
        <li
          key={size}
          className="inline-flex h-5 items-center rounded-control border border-accent-mid bg-accent-tint px-1.5 text-[11px] leading-none font-semibold whitespace-nowrap text-accent tabular-nums"
        >
          {size}
        </li>
      ))}
    </ul>
  )
}
