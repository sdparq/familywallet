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
  const chartData = rows.map((row) => ({
    name: row.name.slice(0, 3),
    Presupuesto: show(row.budget),
    Gastado: show(row.spent),
  }))

  const totals = rows.reduce(
    (sum, row) => ({
      budget: sum.budget + row.budget,
      spent: sum.spent + row.spent,
      remaining: sum.remaining + row.remaining,
    }),
    { budget: 0, spent: 0, remaining: 0 },
  )

  const active = rows.filter((row) => row.spent > 0)
  const average = active.length ? active.reduce((sum, row) => sum + row.spent, 0) / active.length : 0

  return (
    <div className="space-y-4">
      <Card title={`Presupuesto vs gastado · ${data.year}`}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000010" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Presupuesto" fill="#c8973f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastado" fill="#0f1720" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title={`Resumen anual — gastos variables · ${currency}`}>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-[13px] sm:text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50">
                <th className="px-1 py-2 font-medium">Mes</th>
                <th className="px-1 py-2 text-right font-medium">Presup.</th>
                <th className="px-1 py-2 text-right font-medium">Gastado</th>
                <th className="px-1 py-2 text-right font-medium">Restante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map((row) => (
                <tr
                  key={row.key}
                  onClick={() => onOpenMonth(row.key)}
                  className="cursor-pointer hover:bg-black/[0.02]"
                >
                  <td className="px-1 py-2 font-medium">{row.name}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-ink/60">{formatAmount(show(row.budget))}</td>
                  <td className="px-1 py-2 text-right tabular-nums">{formatAmount(show(row.spent))}</td>
                  <td className={`px-1 py-2 text-right font-medium tabular-nums ${row.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatAmount(show(row.remaining))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black/10 font-semibold">
                <td className="px-1 py-2">Total</td>
                <td className="px-1 py-2 text-right tabular-nums">{formatAmount(show(totals.budget))}</td>
                <td className="px-1 py-2 text-right tabular-nums">{formatAmount(show(totals.spent))}</td>
                <td className={`px-1 py-2 text-right tabular-nums ${totals.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatAmount(show(totals.remaining))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/50">
          Media de gasto en los {active.length} meses con movimientos:{' '}
          <Money aed={average} currency={currency} rate={rate} className="font-medium text-ink/70" />
        </p>
      </Card>
    </div>
  )
}
