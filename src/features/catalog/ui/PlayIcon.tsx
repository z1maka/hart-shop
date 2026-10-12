export function PlayIcon({ size }: { readonly size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className="ml-[8%] fill-current"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
