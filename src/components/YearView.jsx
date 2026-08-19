import { useMemo } from 'react'
import { yearSummary, formatMoney, monthKey, activeTx, toDisplay } from '../lib/calc.js'
import { Card, Stat, Money, Bars } from './ui.jsx'

export default function YearView({ state, display }) {
  const year = state.settings.year
  const rate = state.settings.rate
  const rows = useMemo(() => yearSummary(state, year, display), [state, year, display])

  const totals = rows.reduce((a, r) => ({
    income: a.income + r.income,
    spent: a.spent + r.spent,
    available: a.available + r.available,
    fixed: a.fixed + r.fixed,
    savings: a.savings + r.savings,
  }), { income: 0, spent: 0, available: 0, fixed: 0, savings: 0 })

  const withData = rows.filter((r) => r.spent > 0)
  const avg = withData.length ? totals.spent / withData.length : 0

  const catRows = useMemo(() => {
    const map = new Map()
    for (let m = 1; m <= 12; m += 1) {
      for (const t of activeTx(state, monthKey(year, m))) {
        const cat = t.category || 'Otros'
        map.set(cat, (map.get(cat) || 0) + toDisplay(t, display, rate))
      }
    }
    return [...map.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total)
  }, [state, year, display, rate])

  const maxSpent = Math.max(1, ...rows.map((r) => Math.max(r.spent, r.available)))

  return (
    <>
      <div className="stats">
        <Stat label={`Ingresos ${year}`} value={totals.income} currency={display} tone="pos" />
        <Stat label="Gastos variables" value={totals.spent} currency={display} sub={`${withData.length} ${withData.length === 1 ? 'mes' : 'meses'} con datos`} />
        <Stat label="Media mensual" value={avg} currency={display} sub="Solo meses con gastos" />
        <Stat label="Restante del presupuesto" value={totals.available - totals.spent} currency={display} tone="auto" />
      </div>

      <Card title={`Resumen anual ${year}`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th className="num">Presupuesto</th>
                <th className="num">Gastado</th>
                <th className="num">Restante</th>
                <th style={{ minWidth: 120 }}>Consumo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.available > 0 ? Math.min(150, (r.spent / r.available) * 100) : 0
                return (
                  <tr key={r.key}>
                    <td>{r.name}</td>
                    <td className="num">{formatMoney(r.available, display)}</td>
                    <td className="num">{formatMoney(r.spent, display)}</td>
                    <td className="num"><Money value={r.remaining} currency={display} signed /></td>
                    <td>
                      <span className="bar-track" style={{ display: 'block' }}>
                        <span className="bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: pct > 100 ? 'var(--danger)' : 'var(--blue)' }} />
                      </span>
                    </td>
                  </tr>
                )
              })}
              <tr className="total">
                <td>TOTAL ANUAL</td>
                <td className="num">{formatMoney(totals.available, display)}</td>
                <td className="num">{formatMoney(totals.spent, display)}</td>
                <td className="num"><Money value={totals.available - totals.spent} currency={display} signed /></td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Gasto por mes">
        <Bars rows={rows.map((r) => ({ name: r.name, total: r.spent }))} currency={display} max={maxSpent} />
      </Card>

      <Card title="Gasto por categoría (año)">
        {catRows.length === 0 ? <p className="empty">Sin datos.</p> : <Bars rows={catRows} currency={display} />}
      </Card>
    </>
  )
}
