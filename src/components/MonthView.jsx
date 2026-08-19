import { useMemo, useState } from 'react'
import {
  MONTH_NAMES, monthKey, budgetForMonth, byCategory, byWeek,
  incomeForMonth, weekOfMonth, toDisplay, formatMoney,
} from '../lib/calc.js'
import { Card, Stat, Money, Bars, NumberInput, CurrencySelect, DeleteButton } from './ui.jsx'

const todayISO = () => new Date().toISOString().slice(0, 10)

function AddForm({ categories, monthKeyValue, onAdd }) {
  const empty = {
    concept: '', category: categories[0] || 'Otros', amount: '',
    currency: 'AED', date: monthKeyValue === todayISO().slice(0, 7) ? todayISO() : `${monthKeyValue}-01`,
  }
  const [form, setForm] = useState(empty)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = (e) => {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!form.concept.trim() || !amount) return
    onAdd({
      month: monthKeyValue,
      week: weekOfMonth(form.date),
      concept: form.concept.trim(),
      category: form.category,
      amount,
      currency: form.currency,
      date: form.date || null,
    })
    setForm({ ...empty, concept: '', amount: '', date: form.date })
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field wide">
        <label htmlFor="concept">Concepto</label>
        <input id="concept" value={form.concept} onChange={(e) => set({ concept: e.target.value })} placeholder="Careem, Carrefour…" />
      </div>
      <div className="field">
        <label htmlFor="cat">Categoría</label>
        <select id="cat" value={form.category} onChange={(e) => set({ category: e.target.value })}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="amount">Importe</label>
        <input id="amount" type="number" inputMode="decimal" step="0.01" value={form.amount}
          onChange={(e) => set({ amount: e.target.value })} placeholder="0" />
      </div>
      <div className="field">
        <label htmlFor="cur">Moneda</label>
        <CurrencySelect value={form.currency} onChange={(currency) => set({ currency })} />
      </div>
      <div className="field">
        <label htmlFor="date">Fecha</label>
        <input id="date" type="date" value={form.date || ''} onChange={(e) => set({ date: e.target.value })} />
      </div>
      <button className="btn btn-primary" type="submit">Añadir</button>
    </form>
  )
}

function TxRow({ tx, categories, display, rate, actions }) {
  const patch = (p) => actions.saveTransaction({ ...tx, ...p })
  return (
    <tr>
      <td><input value={tx.concept} onChange={(e) => patch({ concept: e.target.value })} /></td>
      <td className="cell-tight">
        <select className="cat" value={tx.category} onChange={(e) => patch({ category: e.target.value })}>
          {[...new Set([tx.category, ...categories])].filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="cell-tight">
        <NumberInput value={tx.amount} onChange={(amount) => patch({ amount })} style={{ width: 96, textAlign: 'right' }} />
      </td>
      <td className="cell-tight"><CurrencySelect value={tx.currency} onChange={(currency) => patch({ currency })} /></td>
      <td className="cell-tight">
        <input type="date" value={tx.date || ''} style={{ width: 140 }}
          onChange={(e) => patch({ date: e.target.value || null, week: e.target.value ? weekOfMonth(e.target.value) : tx.week })} />
      </td>
      <td className="num">{formatMoney(toDisplay(tx, display, rate), display)}</td>
      <td className="cell-tight">
        <div className="row-actions"><DeleteButton onClick={() => actions.removeTransaction(tx.id)} /></div>
      </td>
    </tr>
  )
}

export default function MonthView({ state, actions, display }) {
  const rate = state.settings.rate
  const year = state.settings.year
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return now.getFullYear() === year ? now.getMonth() + 1 : 1
  })
  const key = monthKey(year, month)

  const budget = useMemo(() => budgetForMonth(state, key, display), [state, key, display])
  const cats = useMemo(() => byCategory(state, key, display), [state, key, display])
  const weeks = useMemo(() => byWeek(state, key, display), [state, key, display])
  const income = useMemo(() => incomeForMonth(state, key), [state, key])
  const count = weeks.reduce((a, w) => a + w.items.length, 0)

  return (
    <>
      <div className="card-head" style={{ marginBottom: 12 }}>
        <div className="inline">
          <button className="btn btn-sm" onClick={() => setMonth((m) => (m === 1 ? 12 : m - 1))} aria-label="Mes anterior">←</button>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 'auto' }}>
            {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n} {year}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => setMonth((m) => (m === 12 ? 1 : m + 1))} aria-label="Mes siguiente">→</button>
        </div>
      </div>

      <div className="stats">
        <Stat label="Ingresos" value={budget.income} currency={display} tone="pos" />
        <Stat label="Gastos del mes" value={budget.spent} currency={display} sub={`${count} ${count === 1 ? 'movimiento' : 'movimientos'}`} />
        <Stat label="Balance" value={budget.balance} currency={display} tone="auto" sub="Ingresos − gastos" />
        <Stat label="Presupuesto restante" value={budget.remaining} currency={display} tone="auto"
          sub={`De ${formatMoney(budget.available, display)} disponibles`} />
      </div>

      <Card title="Nuevo gasto">
        <AddForm categories={state.categories} monthKeyValue={key} onAdd={actions.addTransaction} />
        <p className="hint">La semana se calcula sola a partir de la fecha (días 1-7 → semana 1, 8-14 → semana 2…).</p>
      </Card>

      <Card title={`Gastos de ${MONTH_NAMES[month - 1]}`}>
        {count === 0 ? (
          <p className="empty">Todavía no hay gastos en este mes.</p>
        ) : (
          weeks.filter((w) => w.items.length).map((w) => (
            <div key={w.week}>
              <div className="week-head">
                <h3>Semana {w.week}</h3>
                <span className="tag">{w.items.length} mov.</span>
                <strong><Money value={w.total} currency={display} /></strong>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Concepto</th><th>Categoría</th><th>Importe</th><th>Moneda</th><th>Fecha</th>
                      <th className="num">En {display}</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {w.items.map((tx) => (
                      <TxRow key={tx.id} tx={tx} categories={state.categories} display={display} rate={rate} actions={actions} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card title="Resumen por categoría">
        {cats.length === 0 ? <p className="empty">Sin datos.</p> : (
          <>
            <Bars rows={cats} currency={display} />
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead><tr><th>Categoría</th><th className="num">Nº</th><th className="num">Total</th><th className="num">% del mes</th></tr></thead>
                <tbody>
                  {cats.map((c) => (
                    <tr key={c.category}>
                      <td>{c.category}</td>
                      <td className="num">{c.count}</td>
                      <td className="num">{formatMoney(c.total, display)}</td>
                      <td className="num">{budget.spent ? ((c.total / budget.spent) * 100).toFixed(1) : '0.0'}%</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td>TOTAL MES</td>
                    <td className="num">{count}</td>
                    <td className="num">{formatMoney(budget.spent, display)}</td>
                    <td className="num">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="Ingresos de este mes">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Concepto</th><th className="num">Importe</th><th>Moneda</th><th className="num">En {display}</th><th /></tr></thead>
            <tbody>
              {income.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}{i.overridden && <span className="tag" style={{ marginLeft: 8 }}>ajustado</span>}</td>
                  <td className="cell-tight">
                    <NumberInput value={i.amount} style={{ width: 110, textAlign: 'right' }}
                      onChange={(amount) => actions.setMonthIncome(key, i.id, { amount, currency: i.currency, deleted: false })} />
                  </td>
                  <td className="cell-tight">
                    <CurrencySelect value={i.currency}
                      onChange={(currency) => actions.setMonthIncome(key, i.id, { amount: i.amount, currency, deleted: false })} />
                  </td>
                  <td className="num">{formatMoney(toDisplay(i, display, rate), display)}</td>
                  <td className="cell-tight">
                    {i.overridden && (
                      <button className="btn btn-ghost btn-sm" title="Volver al valor del presupuesto"
                        onClick={() => actions.clearMonthIncome(key, i.id)}>↺</button>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="total">
                <td>TOTAL INGRESOS</td><td /><td />
                <td className="num">{formatMoney(budget.income, display)}</td><td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Si cambias un importe aquí solo afecta a este mes. Con ↺ vuelve al valor del presupuesto general.</p>
      </Card>
    </>
  )
}
