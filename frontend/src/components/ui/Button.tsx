import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'accent' | 'outline' | 'ghost'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
}

type BaseProps = {
  variant?: Variant
  loading?: boolean
  children: ReactNode
  className?: string
}

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { to?: undefined; href?: undefined }

type ButtonAsLink = BaseProps & { to: string; href?: undefined; external?: undefined; disabled?: boolean }

type ButtonAsAnchor = BaseProps & {
  href: string
  to?: undefined
  external?: boolean
  disabled?: boolean
}

type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor

/**
 * Every button in the app today is written inline as
 * `<button className="btn-primary" disabled={loading}>{loading ? '...' : 'Save'}</button>`,
 * which means the button's *width* changes when it enters a loading state
 * (the text "..." is shorter than "Save"), causing a small layout jump on
 * every single form submit in the app. This keeps the label in place and
 * shows a spinner alongside it instead, and centralizes the three ways a
 * "button" actually gets used here (real button, internal Link, external
 * anchor) behind one consistent API.
 */
export function Button(props: ButtonProps) {
  const { variant = 'primary', loading = false, children, className = '' } = props
  const classes = `${VARIANT_CLASS[variant]} ${className}`.trim()

  const content = (
    <>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </>
  )

  if ('to' in props && props.to) {
    const { to, disabled } = props
    if (disabled) {
      return (
        <span className={`${classes} pointer-events-none opacity-50`} aria-disabled="true">
          {content}
        </span>
      )
    }
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  if ('href' in props && props.href) {
    const { href, external, disabled } = props
    if (disabled) {
      return (
        <span className={`${classes} pointer-events-none opacity-50`} aria-disabled="true">
          {content}
        </span>
      )
    }
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className={classes}>
        {content}
      </a>
    )
  }

  const { variant: _v, loading: _l, className: _c, to: _t, href: _h, ...rest } = props as ButtonAsButton
  return (
    <button className={classes} disabled={loading || rest.disabled} {...rest}>
      {content}
    </button>
  )
}
