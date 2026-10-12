import { getTranslations } from 'next-intl/server'

const TRUST_KEYS = ['ownProduction', 'novaPoshta', 'codAvailable', 'returns14'] as const

export async function TrustRow() {
  const t = await getTranslations('trust')

  return (
    <ul className="flex flex-wrap gap-x-7 gap-y-2.5">
      {TRUST_KEYS.map((key) => (
        <li key={key} className="flex items-center gap-2.5 text-[13px] font-medium text-muted">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          {t(key)}
        </li>
      ))}
    </ul>
  )
}
