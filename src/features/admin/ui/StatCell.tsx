// A number with its name inside a stats card: a row on a phone, a column
// from the small screens up, where the cells sit side by side.
export function StatCell({
  label,
  value,
  hint,
}: {
  readonly label: string
  readonly value: string
  readonly hint?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-3.5 sm:flex-col sm:justify-start sm:gap-1 sm:py-4">
      <dt className="text-[12.5px] font-medium text-muted">{label}</dt>
      <dd className="text-right sm:text-left">
        <span className="block text-[18px] leading-tight font-semibold whitespace-nowrap text-ink sm:text-[22px]">
          {value}
        </span>
        {hint ? <span className="mt-0.5 block text-[12px] text-faint">{hint}</span> : null}
      </dd>
    </div>
  )
}
