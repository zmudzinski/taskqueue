import { forwardRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { className = '', children, ...props },
  ref,
) {
  return (
    <section ref={ref} className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </section>
  )
})
