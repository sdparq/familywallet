import { useMemo, useState } from 'react'
import CategoryPanel from './CategoryPanel'
import ExpenseDialog from './ExpenseDialog'
import ImportDialog from './ImportDialog'
import MonthIncomePanel from './MonthIncomePanel'
import { Card, Money, Progress, Stat } from './ui'
import { MONTH_NAMES, monthKey, summarizeMonth, toAED } from '../lib/money'
import { frequentConcepts } from '../lib/suggest'
import { useData } from '../lib/store'
import type { Currency, Transaction } from '../lib/types'

const WEEKS = [1, 2, 3, 4, 5]

export default function MonthView({ currency, month, onMonthChange }: {
  currency: Currency
  month: string
  onMonthChange: (month: string) => void
}) {
  const { data } = useData()
  const { rate } = data.settings
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [prefill, setPrefill] = useState<Partial<Transaction> | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const summary = useMemo(() => summarizeMonth(data, month), [data, month])
  const transactions = useMemo(
    () => data.transactions.filter((tx) => tx.month === month),
    [data.transactions, month],
  )

  const index = Number(month.slice(5)) - 1
  const step = (delta: number) => {
    const next = index + delta
    if (next >= 0 && next < 12) onMonthChange(monthKey(data.year, next))
  }

  const frequent = useMemo(() => frequentConcepts(data.transactions), [data.transactions])

  const openNew = (values?: Partial<Transaction>) => {
    setEditing(null)
    setPrefill(values)
    setDialogOpen(true)
  }
  const openEdit = (tx: Transaction) => { setEditing(tx); setPrefill(undefined); setDialogOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost px-3" onClick={() => step(-1)} disabled={index === 0}>‹</button>
        <select
          className="field text-center font-semibold"
          value={month}
          onChange={(event) => onMonthChange(event.target.value)}
        >
          {MONTH_NAMES.map((name, position) => (
            <option key={name} value={monthKey(data.year, position)}>{name} {data.year}</option>
          ))}
        </select>
        <button type="button" className="btn-ghost px-3" onClick={() => step(1)} disabled={index === 11}>›</button>
      </div>

      {!summary.hasData && (
        <p className="rounded-md border border-line bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          {MONTH_NAMES[index]} no tenía nada apuntado en el Excel. Los ingresos que ves
          son la previsión: si cobrasteis otra cosa, edítalos abajo.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Ingresos"
          value={<Money aed={summary.income} currency={currency} rate={rate} />}
          hint={data.monthIncomes[month] ? 'Ajustados para este mes' : 'Previsión base'}
        />
        <Stat
          label="Gastado"
          value={<Money aed={summary.spent} currency={currency} rate={rate} />}
          hint={transactions.length === 1 ? '1 movimiento' : `${transactions.length} movimientos`}
        />
      </div>

      <Card title="Balance del mes">
        <Progress value={summary.income > 0 ? summary.spent / summary.income : 0} />
        <dl className="mt-3 space-y-1 text-sm text-neutral-600">
          <div className="flex justify-between gap-4">
            <dt>Ingresos</dt>
            <dd><Money aed={summary.income} currency={currency} rate={rate} /></dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>− Gastado</dt>
            <dd><Money aed={-summary.spent} currency={currency} rate={rate} /></dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-1 font-semibold">
            <dt className="text-neutral-900">= Balance</dt>
            <dd className={summary.balance < 0 ? 'text-red-700' : 'text-emerald-700'}>
              <Money aed={summary.balance} currency={currency} rate={rate} />
            </dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn-primary w-full py-3" onClick={() => openNew()}>
          Añadir gasto
        </button>
        <button type="button" className="btn-ghost w-full py-3" onClick={() => setImportOpen(true)}>
          Pegar del banco
        </button>
      </div>

      {frequent.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-neutral-500">
            Habituales — toca uno y solo tienes que poner el importe
          </p>
          <div className="flex flex-wrap gap-1.5">
            {frequent.map((item) => (
              <button
                key={item.concept}
                type="button"
                onClick={() => openNew({
                  concept: item.concept,
                  category: item.category,
                  currency: item.currency,
                })}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm
                  transition hover:border-neutral-900 hover:bg-neutral-50"
              >
                {item.concept}
              </button>
            ))}
          </div>
        </div>
      )}

      <Card title="Registro semanal">
        {transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Todavía no hay gastos en este mes.</p>
        ) : (
          <div className="space-y-4">
            {WEEKS.map((week) => {
              const rows = transactions.filter((tx) => tx.week === week)
              if (rows.length === 0) return null
              const total = rows.reduce((sum, tx) => sum + toAED(tx.amount, tx.currency, rate), 0)
              return (
                <div key={week}>
                  <div className="mb-1 flex items-baseline justify-between border-b border-line pb-1">
                    <h3 className="text-xs font-medium text-neutral-500">Semana {week}</h3>
                    <Money aed={total} currency={currency} rate={rate} className="text-sm font-semibold" />
                  </div>
                  <ul className="divide-y divide-line">
                    {rows.map((tx) => (
                      <li key={tx.id}>
                        <button
                          type="button"
                          onClick={() => openEdit(tx)}
                          className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-neutral-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{tx.concept}</span>
                            <span className="text-xs text-neutral-500">
                              {tx.category}
                              {tx.date && ` · ${tx.date.slice(8)}/${tx.date.slice(5, 7)}`}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <Money
                              aed={toAED(tx.amount, tx.currency, rate)}
                              currency={currency}
                              rate={rate}
                              className="text-sm font-semibold"
                            />
                            {tx.currency !== currency && (
                              <span className="block text-[11px] text-neutral-400">
                                {tx.amount.toLocaleString('es-ES')} {tx.currency}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <CategoryPanel currency={currency} month={month} />
      <MonthIncomePanel currency={currency} month={month} />

      {dialogOpen && (
        <ExpenseDialog
          month={month}
          editing={editing}
          prefill={prefill}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {importOpen && <ImportDialog month={month} onClose={() => setImportOpen(false)} />}
    </div>
  )
}
