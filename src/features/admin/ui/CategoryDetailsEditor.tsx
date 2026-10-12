'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { updateCategoryDetailsAction } from '@/features/admin/actions/category-actions'
import { errorText } from '@/features/admin/ui/messages'
import {
  CATEGORY_STORY_MAX_LENGTH,
  FAQ_ANSWER_MAX_LENGTH,
  FAQ_MAX_ENTRIES,
  FAQ_MIN_LENGTH,
  FAQ_QUESTION_MAX_LENGTH,
  finishedFaq,
  unfinishedFaqIndex,
  type FaqEntry,
} from '@/features/catalog/model/category-content'
import { GoogleCategorySelect } from '@/features/admin/ui/GoogleCategorySelect'
import { Button } from '@/components/ui/Button'
import { inputClassName, textareaClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type CategoryDetailsEditorProps = {
  readonly categoryId: string
  readonly name: string
  readonly description: string | null
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly seoText: string | null
  readonly faq: readonly FaqEntry[]
  readonly googleProductCategory: number | null
}

// A row keeps its id while it is on screen, so removing a row above it does
// not hand its inputs (and the cursor in them) to a different question.
type FaqDraft = FaqEntry & { readonly id: number }

const labelClassName = 'flex flex-col gap-1 text-[12px] font-semibold text-muted'

export function CategoryDetailsEditor({
  categoryId,
  name: initialName,
  description: initialDescription,
  seoTitle: initialSeoTitle,
  seoDescription: initialSeoDescription,
  seoText: initialSeoText,
  faq: initialFaq,
  googleProductCategory: initialGoogleCategory,
}: CategoryDetailsEditorProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(initialSeoDescription ?? '')
  const [seoText, setSeoText] = useState(initialSeoText ?? '')
  const [googleCategory, setGoogleCategory] = useState(
    initialGoogleCategory === null ? '' : String(initialGoogleCategory),
  )
  const [faq, setFaq] = useState<readonly FaqDraft[]>(() =>
    initialFaq.map((entry, index) => ({ ...entry, id: index })),
  )
  const nextFaqId = useRef(initialFaq.length)
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function addFaq() {
    const id = nextFaqId.current
    nextFaqId.current += 1
    setFaq([...faq, { id, question: '', answer: '' }])
  }

  function save() {
    setNotice(null)
    const unfinished = unfinishedFaqIndex(faq)
    if (unfinished !== -1) {
      setNotice({
        text: `Вопрос ${unfinished + 1}: заполните и вопрос, и ответ, не короче ${FAQ_MIN_LENGTH} знаков`,
        isError: true,
      })
      return
    }

    startTransition(async () => {
      const result = await updateCategoryDetailsAction({
        categoryId,
        name,
        description,
        seoTitle,
        seoDescription,
        seoText,
        faq: finishedFaq(faq),
        googleProductCategory: googleCategory === '' ? null : Number(googleCategory),
      })

      if (!result.ok) {
        setNotice({ text: errorText(result.error), isError: true })
        return
      }

      setNotice({ text: 'Сохранено.', isError: false })
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2.5 sm:grid-cols-[1fr_1.6fr]">
        <label className={labelClassName}>
          Название
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            className={cn(inputClassName, 'font-normal')}
          />
        </label>
        <label className={labelClassName}>
          Описание над сеткой
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            className={cn(inputClassName, 'font-normal')}
          />
        </label>
        <label className={labelClassName}>
          Заголовок в Google
          <input
            value={seoTitle}
            onChange={(event) => setSeoTitle(event.target.value)}
            maxLength={70}
            placeholder="Пусто — название категории"
            className={cn(inputClassName, 'font-normal')}
          />
        </label>
        <label className={labelClassName}>
          Описание в Google (до 160 знаков)
          <input
            value={seoDescription}
            onChange={(event) => setSeoDescription(event.target.value)}
            maxLength={160}
            placeholder="Пусто — описание над сеткой"
            className={cn(inputClassName, 'font-normal')}
          />
        </label>
      </div>

      <label className={labelClassName}>
        Категория Google для рекламы в Покупках
        <GoogleCategorySelect
          value={googleCategory}
          onChange={setGoogleCategory}
          emptyLabel="Не указана — Google угадает сам"
        />
      </label>

      <label className={labelClassName}>
        Текст под каталогом
        <textarea
          value={seoText}
          onChange={(event) => setSeoText(event.target.value)}
          rows={12}
          maxLength={CATEGORY_STORY_MAX_LENGTH}
          placeholder={'Абзацы через пустую строку. Строка «## Заголовок» — подзаголовок, строки «- пункт» — список.'}
          className={cn(textareaClassName, 'font-normal')}
        />
      </label>

      <FaqEditor entries={faq} onChange={setFaq} onAdd={addFaq} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={save}
          disabled={isPending || name.trim().length < 2}
        >
          {isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        <p className="text-[11.5px] leading-relaxed text-faint">
          Адрес страницы не меняется — старые ссылки продолжают работать.
        </p>
      </div>
      {notice ? (
        <p
          className={cn('text-[12px] font-medium', notice.isError ? 'text-alert' : 'text-accent-hover')}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  )
}

// The questions buyers ask, answered once here and printed under the grid
// with the FAQ markup Google reads.
function FaqEditor({
  entries,
  onChange,
  onAdd,
}: {
  readonly entries: readonly FaqDraft[]
  readonly onChange: (entries: readonly FaqDraft[]) => void
  readonly onAdd: () => void
}) {
  function update(index: number, patch: Partial<FaqEntry>) {
    onChange(entries.map((entry, at) => (at === index ? { ...entry, ...patch } : entry)))
  }

  return (
    <div className="grid gap-2.5">
      <p className="text-[12px] font-semibold text-muted">Вопросы и ответы под каталогом</p>
      {entries.map((entry, index) => (
        <div key={entry.id} className="grid gap-1.5 rounded-control border border-subtle bg-sunken p-3">
          <input
            value={entry.question}
            onChange={(event) => update(index, { question: event.target.value })}
            maxLength={FAQ_QUESTION_MAX_LENGTH}
            placeholder="Вопрос"
            className={cn(inputClassName, 'font-normal')}
          />
          <textarea
            value={entry.answer}
            onChange={(event) => update(index, { answer: event.target.value })}
            rows={3}
            maxLength={FAQ_ANSWER_MAX_LENGTH}
            placeholder="Ответ"
            className={cn(textareaClassName, 'min-h-20 font-normal')}
          />
          <button
            type="button"
            onClick={() => onChange(entries.filter((_, at) => at !== index))}
            className="justify-self-start text-[12px] font-semibold text-muted hover:text-alert"
          >
            Убрать вопрос
          </button>
        </div>
      ))}
      {entries.length < FAQ_MAX_ENTRIES ? (
        <Button size="sm" variant="secondary" onClick={onAdd} className="justify-self-start">
          Добавить вопрос
        </Button>
      ) : null}
    </div>
  )
}
