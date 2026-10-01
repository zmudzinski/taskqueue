import { useId } from 'react'

type LogoMarkProps = {
  className?: string
}

// TQ mark: two stacked bars and a dot narrowing into a funnel ("tasks in flow").
export function LogoMark({ className }: LogoMarkProps) {
  const id = useId()
  const topId = `${id}-top`
  const midId = `${id}-mid`

  return (
    <svg className={className} viewBox="0 0 184 174" role="img" aria-label="TaskQueue">
      <defs>
        <linearGradient id={topId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1570F5" />
          <stop offset="1" stopColor="#0A45E0" />
        </linearGradient>
        <linearGradient id={midId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5297FA" />
          <stop offset="1" stopColor="#3F82F3" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="184" height="48" rx="24" fill={`url(#${topId})`} />
      <rect x="27" y="62" width="130" height="46" rx="23" fill={`url(#${midId})`} />
      <circle cx="92" cy="147" r="26" fill="#71AAFB" />
    </svg>
  )
}
