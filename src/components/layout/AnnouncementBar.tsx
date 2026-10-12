import { getTranslations } from 'next-intl/server'

export async function AnnouncementBar() {
  const t = await getTranslations('announcement')

  return (
    <div className="bg-ink px-7 py-2 text-center text-[12px] font-medium text-on-dark">
      <span>{t('line')}</span>
    </div>
  )
}
