'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName } from '@/components/ui/Field'
import { errorText } from '@/features/admin/ui/messages'
import { saveCodFeeAction } from '@/features/settlements/actions/settlement-actions'

type CodFeeFormProps = {
  readonly fee: { readonly percent: string; readonly fixed: string; readonly label: string } | null
}

// The rate of the workshop's carrier contract. Each settlement copies it, so
// a change here leaves the settlements already made as they were.
export function CodFeeForm({ fee }: CodFeeFormProps) {
  const router = useRouter()
  const [percent, setPercent] = useState(fee?.percent ?? '')
  const [fixed, setFixed] = useState(fee?.fixed ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save() {
    setError(null)
    setIsSaved(false)
    startTransition(async () => {
      const result = await saveCodFeeAction({ percent, fixed })
      if (!result.ok) {
        setError(result.error.hint ?? errorText(result.error))
        return
      }
      setIsSaved(true)
      router.refresh()
    })
  }

  return (
    <section className="rounded-card border border-subtle bg-surface p-5">
      <h2 className="text-[14px] font-semibold text-ink">
        Комиссия Новой Почты за наложенный платёж
      </h2>
      <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-muted">
        Как в договоре цеха с Новой Почтой. Вычитается из нашей разницы только у заказов с
        наложенным платежом, с суммы, которую забрала почта. Каждый акт запоминает ставку, поэтому
        её смена не меняет уже созданные акты.
      </p>
      {fee ? null : (
        <p className="mt-2 text-[12.5px] font-semibold text-alert">
          Ставка не указана — без неё акт не создать.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Процент" className="w-32">
          <input
            className={inputClassName}
            inputMode="decimal"
            placeholder="2"
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
          />
        </Field>
        <Field label="Плюс за посылку, ₴" className="w-40">
          <input
            className={inputClassName}
            inputMode="decimal"
            placeholder="20"
            value={fixed}
            onChange={(event) => setFixed(event.target.value)}
          />
        </Field>
        <Button onClick={save} disabled={isPending}>
          Сохранить
        </Button>
        {isSaved && !isPending ? (
          <span className="pb-3 text-[12.5px] text-muted">Сохранено</span>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-[12.5px] font-medium text-alert">{error}</p> : null}
    </section>
  )
}
