import type { ReactNode } from 'react'
import type { Currency } from '../lib/types'
import { formatMoney, toEUR } from '../lib/money'

/** Un importe guardado en AED, mostrado en la moneda que el usuario tenga elegida. */
export const Money = ({ aed, currency, rate, className = '' }: {
  aed: number
  currency: Currency
  rate: number
  className?: string
}) => (
  <span className={`tabular-nums ${className}`}>
    {formatMoney(currency === 'AED' ? aed : toEUR(aed, 'AED', rate), currency)}
  </span>
)

export const Card = ({ title, action, children, className = '' }: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <section className={`card ${className}`}>
    {(title || action) && (
      <header className="mb-3 flex items-center justify-between gap-3">
        {title && <h2 className="text-sm font-medium text-neutral-900">{title}</h2>}
        {action}
      </header>
    )}
    {children}
  </section>
)

export const Stat = ({ label, value, hint, tone = 'neutral' }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'neutral' | 'good' | 'bad'
}) => {
  const tones = {
    neutral: 'text-neutral-900',
    good: 'text-emerald-700',
    bad: 'text-red-700',
  }
  return (
    <div className="card">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold sm:text-2xl ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}

export const Progress = ({ value }: { value: number }) => {
  const pct = Math.min(100, Math.max(0, value * 100))
  const color = pct < 100 ? 'bg-neutral-900' : 'bg-red-700'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export const CurrencyToggle = ({ value, onChange }: {
  value: Currency
  onChange: (currency: Currency) => void
}) => (
  <div className="inline-flex overflow-hidden rounded-md border border-neutral-300">
    {(['AED', 'EUR'] as const).map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={`px-2.5 py-1 text-xs transition ${
          value === option ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        {option}
      </button>
    ))}
  </div>
)

/** Campo numérico que deja el input vacío mientras se escribe, sin forzar un 0. */
export const NumberField = ({ value, onChange, className = '', ...rest }: {
  value: number
  onChange: (value: number) => void
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) => (
  <input
    {...rest}
    type="number"
    inputMode="decimal"
    step="0.01"
    className={`field text-right tabular-nums ${className}`}
    value={Number.isFinite(value) ? String(value) : ''}
    onFocus={(event) => event.target.select()}
    onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
  />
)
