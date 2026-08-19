import { sumIn, toDisplay, formatMoney, convert } from '../lib/calc.js'
import { Card, Stat, Money, NumberInput, CurrencySelect, DeleteButton, Bars } from './ui.jsx'

function EditableList({ rows, display, rate, onSave, onRemove, onAdd, addLabel, totalLabel }) {
  const total = sumIn(rows, display, rate)
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Concepto</th><th className="num">Importe</th><th>Moneda</th><th className="num">En {display}</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><input value={r.name} onChange={(e) => onSave({ ...r, name: e.target.value })} /></td>
                <td className="cell-tight">
                  <NumberInput value={r.amount} style={{ width: 110, textAlign: 'right' }}
                    onChange={(amount) => onSave({ ...r, amount })} />
                </td>
                <td className="cell-tight">
                  <CurrencySelect value={r.currency} onChange={(currency) => onSave({ ...r, currency })} />
                </td>
                <td className="num">{formatMoney(toDisplay(r, display, rate), display)}</td>
                <td className="cell-tight"><div className="row-actions"><DeleteButton onClick={() => onRemove(r.id)} /></div></td>
              </tr>
            ))}
            <tr className="total">
              <td>{totalLabel}</td><td /><td />
              <td className="num">{formatMoney(total, display)}</td><td />
            </tr>
          </tbody>
        </table>
      </div>
      <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={onAdd}>+ {addLabel}</button>
    </>
  )
}

export default function BudgetView({ state, actions, display }) {
  const rate = state.settings.rate
  const income = state.income.filter((i) => !i.deleted)
  const fixed = state.fixed.filter((f) => !f.deleted)
  const savings = state.savings.filter((s) => !s.deleted)

  const totalIncome = sumIn(income, display, rate)
  const totalFixed = sumIn(fixed, display, rate)
  const totalSavings = savings.reduce((a, s) => a + convert(s.contribution, s.currency || 'AED', display, rate), 0)
  const available = totalIncome - totalFixed - totalSavings

  const fixedBars = fixed
    .map((f) => ({ category: f.name, total: toDisplay(f, display, rate) }))
    .sort((a, b) => b.total - a.total)

  return (
    <>
      <div className="stats">
        <Stat label="Total ingresos" value={totalIncome} currency={display} tone="pos" />
        <Stat label="Gastos fijos" value={totalFixed} currency={display}
          sub={totalIncome ? `${((totalFixed / totalIncome) * 100).toFixed(0)}% de los ingresos` : ''} />
        <Stat label="Ahorro mensual" value={totalSavings} currency={display}
          sub={totalIncome ? `${((totalSavings / totalIncome) * 100).toFixed(0)}% de los ingresos` : ''} />
        <Stat label="Disponible para gastar" value={available} currency={display} tone="auto" sub="Presupuesto de cada mes" />
      </div>

      <Card title="Ingresos base (todos los meses)">
        <EditableList rows={income} display={display} rate={rate} totalLabel="TOTAL INGRESOS" addLabel="Añadir ingreso"
          onSave={actions.saveIncome} onRemove={actions.removeIncome} onAdd={actions.addIncome} />
        <p className="hint">Son los importes por defecto. En la pestaña Mes puedes ajustar un mes concreto sin tocar esto.</p>
      </Card>

      <Card title="Previsión de gastos fijos">
        <EditableList rows={fixed} display={display} rate={rate} totalLabel="TOTAL GASTOS FIJOS" addLabel="Añadir gasto fijo"
          onSave={actions.saveFixed} onRemove={actions.removeFixed} onAdd={actions.addFixed} />
      </Card>

      <Card title="Reparto de los gastos fijos">
        {fixedBars.length === 0 ? <p className="empty">Sin datos.</p> : <Bars rows={fixedBars} currency={display} />}
      </Card>

      <Card title="Distribución del ingreso">
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><td>Total ingresos</td><td className="num">{formatMoney(totalIncome, display)}</td></tr>
              <tr><td>(−) Gastos fijos</td><td className="num">−{formatMoney(totalFixed, display)}</td></tr>
              <tr><td>(−) Ahorros</td><td className="num">−{formatMoney(totalSavings, display)}</td></tr>
              <tr className="total">
                <td>= Disponible para gastar</td>
                <td className="num"><Money value={available} currency={display} signed /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
