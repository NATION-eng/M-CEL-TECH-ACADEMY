import type { HTMLAttributes, ReactNode } from 'react'

export function Card({
  children,
  hover = false,
  className = '',
  ...rest
}: {
  children: ReactNode
  hover?: boolean
  className?: string
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${hover ? 'card-hover' : 'card'} ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}
