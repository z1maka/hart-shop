export type FaqEntry = {
  readonly question: string
  readonly answer: string
}

export type StoryBlock =
  | { readonly type: 'heading'; readonly text: string }
  | { readonly type: 'paragraph'; readonly text: string }
  | { readonly type: 'list'; readonly items: readonly string[] }

// One place for what the admin may type: the save schema and the editor's
// fields read the same numbers.
export const CATEGORY_STORY_MAX_LENGTH = 8000
export const FAQ_MAX_ENTRIES = 12
export const FAQ_MIN_LENGTH = 3
export const FAQ_QUESTION_MAX_LENGTH = 200
export const FAQ_ANSWER_MAX_LENGTH = 1500

const HEADING_MARK = '## '
const BULLET_MARK = '- '

// The long text under a category grid as the admin types it: paragraphs
// split by a blank line, a line starting with «## » is a heading, lines
// starting with «- » make a list. A heading may sit right above its
// paragraph or its list without a blank line between them.
export function parseStory(text: string): StoryBlock[] {
  return text
    .split(/\n\s*\n/)
    .flatMap((chunk) => blocksOf(chunk.split('\n').map((line) => line.trim())))
}

type Run = { readonly type: 'paragraph' | 'list'; readonly lines: readonly string[] }

function blocksOf(lines: readonly string[]): StoryBlock[] {
  const blocks: StoryBlock[] = []
  let run: Run | null = null

  for (const line of lines) {
    if (line.length === 0) continue
    if (line.startsWith(HEADING_MARK)) {
      if (run) blocks.push(blockOfRun(run))
      run = null
      blocks.push({ type: 'heading', text: line.slice(HEADING_MARK.length).trim() })
      continue
    }
    const type = line.startsWith(BULLET_MARK) ? 'list' : 'paragraph'
    if (run && run.type !== type) {
      blocks.push(blockOfRun(run))
      run = null
    }
    run = { type, lines: run ? [...run.lines, line] : [line] }
  }
  if (run) blocks.push(blockOfRun(run))

  return blocks
}

function blockOfRun(run: Run): StoryBlock {
  if (run.type === 'list') {
    return { type: 'list', items: run.lines.map((line) => line.slice(BULLET_MARK.length).trim()) }
  }
  return { type: 'paragraph', text: run.lines.join(' ') }
}

function isBlankFaq(entry: FaqEntry): boolean {
  return entry.question.trim() === '' && entry.answer.trim() === ''
}

function isFinishedFaq(entry: FaqEntry): boolean {
  return entry.question.trim().length >= FAQ_MIN_LENGTH && entry.answer.trim().length >= FAQ_MIN_LENGTH
}

// Rows the admin left fully blank are simply not saved; a row with only one
// half, or a half too short to mean anything, is the first thing to point
// at before anything leaves the form. -1 when every row is fine.
export function unfinishedFaqIndex(entries: readonly FaqEntry[]): number {
  return entries.findIndex((entry) => !isBlankFaq(entry) && !isFinishedFaq(entry))
}

export function finishedFaq(entries: readonly FaqEntry[]): FaqEntry[] {
  return entries.filter((entry) => !isBlankFaq(entry)).map((entry) => ({
    question: entry.question.trim(),
    answer: entry.answer.trim(),
  }))
}
