type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  ariaLabel: string
}

export function Switch({ checked, onCheckedChange, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      className={`ui-switch ${checked ? 'is-on' : ''}`}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="ui-switch-thumb" />
    </button>
  )
}
