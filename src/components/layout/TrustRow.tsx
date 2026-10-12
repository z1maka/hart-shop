import { getTranslations } from 'next-intl/server'

const TRUST_KEYS = ['ownProduction', 'novaPoshta', 'codAvailable', 'returns14'] as const

export async function TrustRow() {
  const t = await getTranslations('trust')

  return (
    <ul className="flex flex-wrap gap-x-7 gap-y-2.5">
      {TRUST_KEYS.map((key) => (
        <li key={key} className="flex items-center gap-2 text-[13px] font-bold text-ink">
          <span className="size-2 bg-khaki-mark" aria-hidden />
          {t(key)}
        </li>
      ))}
    </ul>
  )
}
