// The llms.txt format (llmstxt.org): a title, a one-paragraph summary as a
// quote, free paragraphs, then sections of links with a short note each. AI
// assistants read it to learn what the site is before they crawl it.

export type LlmsTxtLink = {
  readonly title: string
  readonly url: string
  readonly note: string
}

export type LlmsTxtSection = {
  readonly heading: string
  readonly links: readonly LlmsTxtLink[]
}

export type LlmsTxtInput = {
  readonly title: string
  readonly summary: string
  readonly details: readonly string[]
  readonly sections: readonly LlmsTxtSection[]
}

export function buildLlmsTxt(input: LlmsTxtInput): string {
  const blocks = [
    `# ${input.title}`,
    `> ${singleLine(input.summary)}`,
    ...input.details.map(singleLine),
    ...input.sections
      .filter((section) => section.links.length > 0)
      .map((section) => [`## ${section.heading}`, ...section.links.map(linkLine)].join('\n')),
  ]

  return `${blocks.join('\n\n')}\n`
}

function linkLine(link: LlmsTxtLink): string {
  const note = singleLine(link.note)
  return note ? `- [${link.title}](${link.url}): ${note}` : `- [${link.title}](${link.url})`
}

// A line break inside a quote or a list item would end it early.
function singleLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
