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
        {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h2>}
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
    neutral: 'text-ink',
    good: 'text-emerald-600',
    bad: 'text-rose-600',
  }
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`mt-1 text-xl font-semibold sm:text-2xl ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  )
}

export const Progress = ({ value }: { value: number }) => {
  const pct = Math.min(100, Math.max(0, value * 100))
  const color = pct < 75 ? 'bg-emerald-500' : pct < 100 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export const CurrencyToggle = ({ value, onChange }: {
  value: Currency
  onChange: (currency: Currency) => void
}) => (
  <div className="inline-flex rounded-xl border border-white/20 p-0.5">
    {(['AED', 'EUR'] as const).map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
          value === option ? 'bg-white text-ink' : 'text-white/70 hover:text-white'
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
