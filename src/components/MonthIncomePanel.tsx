import { incomesForMonth } from '../lib/money'
import { useData } from '../lib/store'
import type { Currency, LineItem } from '../lib/types'
import { Card, Money, NumberField } from './ui'

/**
 * Ingresos del mes. Por defecto son los del presupuesto base; al tocarlos se guarda
 * un ajuste solo para ese mes, igual que se hacía a mano en las hojas del Excel.
 */
export default function MonthIncomePanel({ currency, month }: { currency: Currency; month: string }) {
  const { data, dispatch } = useData()
  const { rate } = data.settings
  const items = incomesForMonth(data, month)
  const isAdjusted = Boolean(data.monthIncomes[month])

  const update = (id: string, changes: Partial<LineItem>) => {
    const next = items.map((item) => (item.id === id ? { ...item, ...changes } : item))
    dispatch({ type: 'monthIncomes.set', month, items: next })
  }

  const reset = () => dispatch({ type: 'monthIncomes.set', month, items: null })

  return (
    <Card
      title="Ingresos del mes"
      action={isAdjusted && (
        <button type="button" className="text-xs font-medium text-neutral-600 underline hover:text-neutral-900" onClick={reset}>
          Volver al importe base
        </button>
      )}
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="grid grid-cols-[1fr_7rem_4.5rem] items-center gap-2">
            <span className="truncate text-sm">{item.name}</span>
            <NumberField value={item.amount} onChange={(amount) => update(item.id, { amount })} />
            <select
              className="field px-2 py-2 text-sm"
              value={item.currency}
              onChange={(event) => update(item.id, { currency: event.target.value as Currency })}
            >
              <option value="AED">AED</option>
              <option value="EUR">EUR</option>
            </select>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between border-t border-line pt-2 text-sm font-semibold">
        <span>Total ingresos</span>
        <Money
          aed={items.reduce((sum, item) => sum + (item.currency === 'AED' ? item.amount : item.amount / rate), 0)}
          currency={currency}
          rate={rate}
        />
      </p>
      {!isAdjusted && (
        <p className="mt-2 text-xs text-neutral-500">
          Estos son los ingresos base. Si los cambias, el ajuste se guarda solo para este mes.
        </p>
      )}
    </Card>
  )
}
