import type { StoryBlock } from '@/features/catalog/model/category-content'

type HeadingLevel = 'h2' | 'h3'

// A heading opens a section of its own on a category page; on a product page
// it sits under the section's h2 «Опис», one step down and quieter.
const HEADING_CLASSES: Record<HeadingLevel, string> = {
  h2: 'mt-8 mb-3 font-display text-h3 font-bold text-ink',
  h3: 'mt-6 mb-2 font-display text-[17px] font-semibold tracking-[0.06em] text-ink first:mt-0',
}

type ReadingBlocksProps = {
  readonly blocks: readonly StoryBlock[]
  readonly headingLevel?: HeadingLevel
}

// Text typed in the admin with «## » headings and «- » lists, printed as
// reading text: a category's story, a product's description.
export function ReadingBlocks({ blocks, headingLevel = 'h2' }: ReadingBlocksProps) {
  return blocks.map((block, index) => (
    <ReadingBlock key={index} block={block} headingLevel={headingLevel} />
  ))
}

function ReadingBlock({
  block,
  headingLevel,
}: {
  readonly block: StoryBlock
  readonly headingLevel: HeadingLevel
}) {
  if (block.type === 'heading') {
    const Heading = headingLevel
    return <Heading className={HEADING_CLASSES[headingLevel]}>{block.text}</Heading>
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
  return <p className="mb-4 text-[15px] leading-relaxed text-pretty break-words text-muted">{block.text}</p>
}
