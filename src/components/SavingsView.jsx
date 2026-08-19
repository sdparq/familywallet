import { convert, formatMoney } from '../lib/calc.js'
import { Card, Stat, Money, NumberInput, CurrencySelect, DeleteButton } from './ui.jsx'

const GROUPS = [
  { id: 'ahorro', title: 'Cuentas de ahorro' },
  { id: 'emergencia', title: 'Fondos de emergencia' },
  { id: 'provision', title: 'Provisiones (sinking funds)' },
]

function Group({ group, rows, display, rate, actions }) {
  const conv = (v, r) => convert(v, r.currency || 'AED', display, rate)
  const totals = rows.reduce((a, r) => ({
    goal: a.goal + conv(r.goal, r),
    contribution: a.contribution + conv(r.contribution, r),
    initial: a.initial + conv(r.initial, r),
    final: a.final + conv((Number(r.initial) || 0) + (Number(r.contribution) || 0), r),
  }), { goal: 0, contribution: 0, initial: 0, final: 0 })

  return (
    <Card title={group.title}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cuenta</th><th className="num">Objetivo</th><th className="num">Contribución</th>
              <th className="num">Saldo inicial</th><th>Moneda</th><th className="num">Saldo final</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><input value={r.name} onChange={(e) => actions.saveSaving({ ...r, name: e.target.value })} /></td>
                <td className="cell-tight"><NumberInput value={r.goal} style={{ width: 100, textAlign: 'right' }}
                  onChange={(goal) => actions.saveSaving({ ...r, goal })} /></td>
                <td className="cell-tight"><NumberInput value={r.contribution} style={{ width: 100, textAlign: 'right' }}
                  onChange={(contribution) => actions.saveSaving({ ...r, contribution })} /></td>
                <td className="cell-tight"><NumberInput value={r.initial} style={{ width: 100, textAlign: 'right' }}
                  onChange={(initial) => actions.saveSaving({ ...r, initial })} /></td>
                <td className="cell-tight"><CurrencySelect value={r.currency} onChange={(currency) => actions.saveSaving({ ...r, currency })} /></td>
                <td className="num">{formatMoney(conv((Number(r.initial) || 0) + (Number(r.contribution) || 0), r), display)}</td>
                <td className="cell-tight"><div className="row-actions"><DeleteButton onClick={() => actions.removeSaving(r.id)} /></div></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="empty">Nada aquí todavía.</td></tr>}
            <tr className="total">
              <td>TOTAL</td>
              <td className="num">{formatMoney(totals.goal, display)}</td>
              <td className="num">{formatMoney(totals.contribution, display)}</td>
              <td className="num">{formatMoney(totals.initial, display)}</td>
              <td />
              <td className="num">{formatMoney(totals.final, display)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => actions.addSaving(group.id)}>+ Añadir línea</button>
    </Card>
  )
}

export default function SavingsView({ state, actions, display }) {
  const rate = state.settings.rate
  const rows = state.savings.filter((s) => !s.deleted)
  const conv = (v, r) => convert(v, r.currency || 'AED', display, rate)
  const contribution = rows.reduce((a, r) => a + conv(r.contribution, r), 0)
  const final = rows.reduce((a, r) => a + conv((Number(r.initial) || 0) + (Number(r.contribution) || 0), r), 0)
  const goal = rows.reduce((a, r) => a + conv(r.goal, r), 0)

  return (
    <>
      <div className="stats">
        <Stat label="Aportación mensual" value={contribution} currency={display} tone="pos" />
        <Stat label="Saldo final" value={final} currency={display} />
        <Stat label="Objetivo total" value={goal} currency={display} />
        <Stat label="Ahorro anual estimado" value={contribution * 12} currency={display} sub="Aportación × 12" />
      </div>

      {GROUPS.map((g) => (
        <Group key={g.id} group={g} rows={rows.filter((r) => (r.group || 'ahorro') === g.id)}
          display={display} rate={rate} actions={actions} />
      ))}

      <p className="hint">La aportación mensual se resta de los ingresos para calcular el presupuesto disponible de cada mes.</p>
    </>
  )
}
