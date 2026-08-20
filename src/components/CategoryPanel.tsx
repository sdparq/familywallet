import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { categoryTotals, formatMoney, toEUR } from '../lib/money'
import { useData } from '../lib/store'
import type { Currency } from '../lib/types'
import { Card, Money } from './ui'

/** Escala de grises de más a menos gasto; se repite si hay muchas categorías. */
const COLORS = ['#171717', '#404040', '#525252', '#737373', '#8f8f8f', '#a3a3a3',
  '#b5b5b5', '#c4c4c4', '#d4d4d4', '#e0e0e0']

export default function CategoryPanel({ currency, month }: { currency: Currency; month: string }) {
  const { data } = useData()
  const { rate } = data.settings
  const totals = useMemo(() => categoryTotals(data, month), [data, month])
  const grandTotal = totals.reduce((sum, entry) => sum + entry.total, 0)

  if (totals.length === 0) return null

  const chartData = totals.map((entry) => ({
    name: entry.category,
    value: Number((currency === 'AED' ? entry.total : toEUR(entry.total, 'AED', rate)).toFixed(2)),
  }))

  return (
    <Card title="Resumen por categoría">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 divide-y divide-line">
        {totals.map((entry, index) => (
          <li key={entry.category} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <span className="truncate">{entry.category}</span>
              <span className="shrink-0 text-xs text-neutral-400">{entry.count}</span>
            </span>
            <span className="shrink-0 text-right">
              <Money aed={entry.total} currency={currency} rate={rate} className="font-medium" />
              <span className="ml-2 text-xs text-neutral-400">
                {Math.round((entry.total / grandTotal) * 100)}%
              </span>
            </span>
          </li>
        ))}
        <li className="flex justify-between gap-3 pt-2 text-sm font-semibold">
          <span>Total mes</span>
          <Money aed={grandTotal} currency={currency} rate={rate} />
        </li>
      </ul>
    </Card>
  )
}
