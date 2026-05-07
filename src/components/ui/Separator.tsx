type SeparatorProps = {
  className?: string
}

export function Separator({ className = '' }: SeparatorProps) {
  return <div className={`ui-separator ${className}`.trim()} aria-hidden="true" />
}
