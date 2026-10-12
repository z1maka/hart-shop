import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// KMU 55 (2010) — the official Ukrainian romanisation, so slugs match how the
// brand is written on customs paperwork and in EU search results.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  ъ: '',
  ы: 'y',
  э: 'e',
  ё: 'e',
}

const APOSTROPHES = /['\u2019\u02BC]/g

const WORD_INITIAL_TO_LATIN: Record<string, string> = {
  є: 'ye',
  ї: 'yi',
  й: 'y',
  ю: 'yu',
  я: 'ya',
}

const LETTER_PATTERN = /\p{L}/u

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function transliterate(value: string): string {
  const source = value.toLowerCase().replace(APOSTROPHES, '').replaceAll('зг', 'zgh')
  let result = ''
  let isWordStart = true

  for (const character of source) {
    if (!LETTER_PATTERN.test(character)) {
      result += character
      isWordStart = true
      continue
    }

    const initial = isWordStart ? WORD_INITIAL_TO_LATIN[character] : undefined
    result += initial ?? CYRILLIC_TO_LATIN[character] ?? character
    isWordStart = false
  }

  return result
}

export function slugify(value: string): string {
  return transliterate(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
