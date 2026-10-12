import { GOOGLE_CATEGORIES } from '@/features/catalog/model/google-category'
import { inputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type GoogleCategorySelectProps = {
  readonly name?: string
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (value: string) => void
  // What an empty choice means here: «не указана» for a category, «как у
  // категории …» for a product.
  readonly emptyLabel: string
  readonly className?: string
}

// Google's category for the shopping feed, picked from the short list the
// catalogue uses; the value is the numeric id, empty for none.
export function GoogleCategorySelect({
  name,
  value,
  defaultValue,
  onChange,
  emptyLabel,
  className,
}: GoogleCategorySelectProps) {
  return (
    <select
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      className={cn(inputClassName, 'font-normal', className)}
    >
      <option value="">{emptyLabel}</option>
      {GOOGLE_CATEGORIES.map((category) => (
        <option key={category.id} value={String(category.id)}>
          {category.label}
        </option>
      ))}
    </select>
  )
}
