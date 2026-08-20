import { savingsContribution } from '../lib/money'
import { useData } from '../lib/store'
import type { Currency, SavingsGroup, SavingsItem } from '../lib/types'
import { Card, Money, NumberField } from './ui'

const GROUPS: Array<{ id: SavingsGroup; title: string; note?: string }> = [
  { id: 'accounts', title: 'Cuentas de ahorro' },
  { id: 'emergency', title: 'Fondos de emergencia' },
  { id: 'sinking', title: 'Provisiones', note: 'Gastos previstos que se van reservando poco a poco.' },
]

const slug = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'nuevo'

export default function SavingsView({ currency }: { currency: Currency }) {
  const { data, dispatch } = useData()
  const { rate } = data.settings

  const setGroup = (group: SavingsGroup, items: SavingsItem[]) =>
    dispatch({ type: 'savings.set', group, items })

  const monthly = savingsContribution(data)

  return (
    <div className="space-y-4">
      <Card title="Ahorro mensual comprometido">
        <p className="text-2xl font-semibold">
          <Money aed={monthly} currency={currency} rate={rate} />
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Cuentas de ahorro y fondos de emergencia. Se descuenta del disponible de cada mes.
        </p>
      </Card>

      {GROUPS.map(({ id, title, note }) => {
        const items = data.savings[id]
        const total = items.reduce(
          (sum, item) => ({
            contribution: sum.contribution + item.contribution,
            balance: sum.balance + item.contribution + item.initialBalance,
          }),
          { contribution: 0, balance: 0 },
        )

        const update = (itemId: string, changes: Partial<SavingsItem>) =>
          setGroup(id, items.map((item) => (item.id === itemId ? { ...item, ...changes } : item)))

        return (
          <Card
            key={id}
            title={title}
            action={
              <button
                type="button"
                className="text-xs font-medium text-neutral-600 underline hover:text-neutral-900"
                onClick={() => setGroup(id, [...items, {
                  id: `${slug(title)}-${items.length + 1}-${Date.now()}`,
                  name: 'Nueva línea',
                  goal: 0,
                  contribution: 0,
                  initialBalance: 0,
                }])}
              >
                + Añadir
              </button>
            }
          >
            {note && <p className="-mt-1 mb-3 text-xs text-neutral-500">{note}</p>}
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-md border border-line p-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="field font-medium"
                      value={item.name}
                      onChange={(event) => update(item.id, { name: event.target.value })}
                    />
                    <button
                      type="button"
                      className="shrink-0 px-2 text-lg text-neutral-400 hover:text-red-700"
                      title="Quitar"
                      onClick={() => confirm(`¿Quitar "${item.name}"?`) &&
                        setGroup(id, items.filter((other) => other.id !== item.id))}
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {([
                      ['Objetivo', 'goal'],
                      ['Aporte/mes', 'contribution'],
                      ['Saldo inicial', 'initialBalance'],
                    ] as const).map(([label, key]) => (
                      <label key={key} className="block">
                        <span className="label">{label}</span>
                        <NumberField
                          value={item[key]}
                          onChange={(value) => update(item.id, { [key]: value })}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-right text-xs text-neutral-500">
                    Saldo final{' '}
                    <Money
                      aed={item.contribution + item.initialBalance}
                      currency={currency}
                      rate={rate}
                      className="font-semibold text-neutral-600"
                    />
                  </p>
                </div>
              ))}
              {items.length === 0 && <p className="py-3 text-center text-sm text-neutral-500">Sin líneas.</p>}
            </div>
            <p className="mt-3 flex justify-between border-t border-line pt-2 text-sm font-semibold">
              <span>Total {title.toLowerCase()}</span>
              <span>
                <Money aed={total.contribution} currency={currency} rate={rate} />
                <span className="ml-2 font-normal text-neutral-500">
                  saldo <Money aed={total.balance} currency={currency} rate={rate} />
                </span>
              </span>
            </p>
          </Card>
        )
      })}
    </div>
  )
}
