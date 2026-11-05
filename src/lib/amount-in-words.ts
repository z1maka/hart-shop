// The sum in words an invoice carries next to the figures: «Чотири тисячі
// чотириста гривень 00 копійок». Hryvnia and thousand are feminine, so their
// one and two read «одна», «дві»; a million is masculine.

type Gender = 'masculine' | 'feminine'
type Forms = readonly [one: string, few: string, many: string]

const KOPIYKY_PER_HRYVNIA = 100
const GROUP_SIZE = 1000
const MAX_HRYVNI = 999_999_999

const UNITS: Record<Gender, readonly string[]> = {
  masculine: ['', 'один', 'два', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять'],
  feminine: ['', 'одна', 'дві', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять'],
}
const TEENS = [
  'десять',
  'одинадцять',
  'дванадцять',
  'тринадцять',
  'чотирнадцять',
  'п’ятнадцять',
  'шістнадцять',
  'сімнадцять',
  'вісімнадцять',
  'дев’ятнадцять',
]
const TENS = [
  '',
  '',
  'двадцять',
  'тридцять',
  'сорок',
  'п’ятдесят',
  'шістдесят',
  'сімдесят',
  'вісімдесят',
  'дев’яносто',
]
const HUNDREDS = [
  '',
  'сто',
  'двісті',
  'триста',
  'чотириста',
  'п’ятсот',
  'шістсот',
  'сімсот',
  'вісімсот',
  'дев’ятсот',
]

const HRYVNIA: Forms = ['гривня', 'гривні', 'гривень']
const KOPIYKA: Forms = ['копійка', 'копійки', 'копійок']
const THOUSAND: Forms = ['тисяча', 'тисячі', 'тисяч']
const MILLION: Forms = ['мільйон', 'мільйони', 'мільйонів']

function pluralForm(count: number, [one, few, many]: Forms): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

function groupWords(group: number, gender: Gender): string[] {
  const hundreds = Math.floor(group / 100)
  const rest = group % 100
  const words = [HUNDREDS[hundreds] ?? '']
  if (rest >= 10 && rest < 20) return [...words, TEENS[rest - 10] ?? ''].filter(Boolean)
  return [...words, TENS[Math.floor(rest / 10)] ?? '', UNITS[gender][rest % 10] ?? ''].filter(
    Boolean,
  )
}

function scaledWords(group: number, gender: Gender, forms: Forms): string[] {
  if (group === 0) return []
  return [...groupWords(group, gender), pluralForm(group, forms)]
}

function hryvniWords(hryvni: number): string {
  if (hryvni === 0) return 'нуль'
  const millions = Math.floor(hryvni / GROUP_SIZE ** 2)
  const thousands = Math.floor(hryvni / GROUP_SIZE) % GROUP_SIZE
  const units = hryvni % GROUP_SIZE
  return [
    ...scaledWords(millions, 'masculine', MILLION),
    ...scaledWords(thousands, 'feminine', THOUSAND),
    ...groupWords(units, 'feminine'),
  ].join(' ')
}

export function amountInWords(amountCents: number): string {
  if (!Number.isInteger(amountCents) || amountCents < 0)
    throw new Error(`not an amount: ${amountCents}`)
  const hryvni = Math.floor(amountCents / KOPIYKY_PER_HRYVNIA)
  const kopiyky = amountCents % KOPIYKY_PER_HRYVNIA
  if (hryvni > MAX_HRYVNI) throw new Error(`amount too large: ${hryvni}`)
  const text = `${hryvniWords(hryvni)} ${pluralForm(hryvni, HRYVNIA)} ${String(kopiyky).padStart(2, '0')} ${pluralForm(kopiyky, KOPIYKA)}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}
