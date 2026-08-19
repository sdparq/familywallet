import { formatMoney } from '../lib/calc.js'

export function Card({ title, action, children }) {
  return (
    <section className="card">
      {(title || action) && (
        <div className="card-head">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, currency, sub, tone }) {
  const cls = tone === 'auto' ? (value >= 0 ? 'pos' : 'neg') : tone || ''
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${cls}`}>{formatMoney(value, currency)}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Money({ value, currency, signed }) {
  const cls = signed ? (value >= 0 ? 'pos' : 'neg') : ''
  return <span className={cls}>{formatMoney(value, currency)}</span>
}

export function Bars({ rows, currency, max }) {
  const top = max ?? Math.max(1, ...rows.map((r) => Math.abs(r.total)))
  return (
    <div>
      {rows.map((r) => (
        <div className="bar-row" key={r.category || r.name}>
          <span className="bar-name" title={r.category || r.name}>{r.category || r.name}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.min(100, (Math.abs(r.total) / top) * 100)}%` }} />
          </span>
          <span className="bar-value">{formatMoney(r.total, currency)}</span>
        </div>
      ))}
    </div>
  )
}

export function NumberInput({ value, onChange, ...rest }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      {...rest}
    />
  )
}

export function CurrencySelect({ value, onChange }) {
  return (
    <select value={value || 'AED'} onChange={(e) => onChange(e.target.value)}>
      <option value="AED">AED</option>
      <option value="EUR">EUR</option>
    </select>
  )
}

export const DeleteButton = ({ onClick, label = 'Borrar' }) => (
  <button type="button" className="btn btn-ghost" onClick={onClick} title={label} aria-label={label}>✕</button>
)
