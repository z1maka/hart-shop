export type SpecRow = {
  readonly label: string
  readonly value: string
}

type SpecTableProps = {
  readonly rows: readonly SpecRow[]
}

export function SpecTable({ rows }: SpecTableProps) {
  return (
    <table className="w-full border-collapse text-[13.5px] text-ink">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-subtle/70 last:border-b-0">
            <th scope="row" className="py-[9px] text-left font-normal text-faint">
              {row.label}
            </th>
            <td className="py-[9px] text-right font-semibold">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
