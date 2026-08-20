import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MONTH_NAMES, formatAmount, formatMoney, monthKey, summarizeMonth, toEUR } from '../lib/money'
import { useData } from '../lib/store'
import type { Currency } from '../lib/types'
import { Card, Money } from './ui'

export default function YearView({ currency, onOpenMonth }: {
  currency: Currency
  onOpenMonth: (month: string) => void
}) {
  const { data } = useData()
  const { rate } = data.settings

  const rows = useMemo(
    () => MONTH_NAMES.map((name, index) => {
      const key = monthKey(data.year, index)
      return { name, key, ...summarizeMonth(data, key) }
    }),
    [data],
  )

  const show = (aed: number) => Number((currency === 'AED' ? aed : toEUR(aed, 'AED', rate)).toFixed(2))
  // Un mes sin movimientos no pinta barra: no hubo mes que medir
  const chartData = rows.map((row) => ({
    name: row.name.slice(0, 3),
    Ingresos: row.hasData ? show(row.income) : null,
    Gastado: row.hasData ? show(row.spent) : null,
  }))

  const active = rows.filter((row) => row.hasData)
  const totals = active.reduce(
    (sum, row) => ({
      income: sum.income + row.income,
      spent: sum.spent + row.spent,
      balance: sum.balance + row.balance,
    }),
    { income: 0, spent: 0, balance: 0 },
  )

  const average = active.length ? active.reduce((sum, row) => sum + row.spent, 0) / active.length : 0

  return (
    <div className="space-y-4">
      <Card title={`Ingresos y gastos · ${data.year}`}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ingresos" fill="#d4d4d4" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Gastado" fill="#171717" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title={`Resumen anual · ${currency}`}>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-[13px] sm:text-sm">
            <thead>
              <tr className="text-left text-[11px] text-neutral-500">
                <th className="px-1 py-2 font-medium">Mes</th>
                <th className="px-1 py-2 text-right font-medium">Ingresos</th>
                <th className="px-1 py-2 text-right font-medium">Gastado</th>
                <th className="px-1 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr
                  key={row.key}
                  onClick={() => onOpenMonth(row.key)}
                  className="cursor-pointer hover:bg-neutral-50"
                >
                  <td className={`px-1 py-2 font-medium ${row.hasData ? '' : 'text-neutral-400'}`}>{row.name}</td>
                  {row.hasData ? (
                    <>
                      <td className="px-1 py-2 text-right tabular-nums text-neutral-500">{formatAmount(show(row.income))}</td>
                      <td className="px-1 py-2 text-right tabular-nums">{formatAmount(show(row.spent))}</td>
                      <td className={`px-1 py-2 text-right font-medium tabular-nums ${row.balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {formatAmount(show(row.balance))}
                      </td>
                    </>
                  ) : (
                    <td className="px-1 py-2 text-right text-neutral-400" colSpan={3}>Sin datos</td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-300 font-semibold">
                <td className="px-1 py-2">Total</td>
                <td className="px-1 py-2 text-right tabular-nums">{formatAmount(show(totals.income))}</td>
                <td className="px-1 py-2 text-right tabular-nums">{formatAmount(show(totals.spent))}</td>
                <td className={`px-1 py-2 text-right tabular-nums ${totals.balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {formatAmount(show(totals.balance))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Los totales y la media cuentan solo los {active.length} meses con movimientos.
          Media de gasto: <Money aed={average} currency={currency} rate={rate} className="font-medium text-neutral-600" />
        </p>
      </Card>
    </div>
  )
}
