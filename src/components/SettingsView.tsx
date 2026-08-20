import { useState } from 'react'
import { savingsContribution, sumAED } from '../lib/money'
import { useData } from '../lib/store'
import type { Currency, LineItem } from '../lib/types'
import { Card, Money, NumberField } from './ui'

const slug = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'linea'

const CSV_HEADER = ['Mes', 'Semana', 'Fecha', 'Concepto', 'Categoría', 'Importe', 'Moneda']

export default function SettingsView({ currency }: { currency: Currency }) {
  const { data, dispatch } = useData()
  const { rate, incomes, fixedExpenses, categories } = data.settings
  const [newCategory, setNewCategory] = useState('')

  const income = sumAED(incomes, rate)
  const fixed = sumAED(fixedExpenses, rate)
  const savings = savingsContribution(data)

  const setList = (key: 'incomes' | 'fixedExpenses', items: LineItem[]) =>
    dispatch({ type: 'settings.set', patch: { [key]: items } })

  const exportCsv = () => {
    const rows = [...data.transactions]
      .sort((a, b) => (a.month + a.week).localeCompare(b.month + b.week))
      .map((tx) => [tx.month, tx.week, tx.date ?? '', tx.concept, tx.category, tx.amount, tx.currency])
    const csv = [CSV_HEADER, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `familywallet-${data.year}.csv` })
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderList = (key: 'incomes' | 'fixedExpenses', items: LineItem[], title: string) => (
    <Card
      title={title}
      action={
        <button
          type="button"
          className="text-xs font-medium text-neutral-600 underline hover:text-neutral-900"
          onClick={() => setList(key, [...items, {
            id: `${slug(title)}-${Date.now()}`, name: 'Nueva línea', amount: 0, currency: 'AED',
          }])}
        >
          + Añadir
        </button>
      }
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="space-y-2 rounded-md border border-line p-2 sm:grid sm:grid-cols-[1fr_6.5rem_4.5rem_1.75rem]
              sm:items-center sm:gap-2 sm:space-y-0 sm:border-0 sm:p-0"
          >
            <input
              className="field text-sm"
              value={item.name}
              onChange={(event) =>
                setList(key, items.map((other) => other.id === item.id ? { ...other, name: event.target.value } : other))}
            />
            <div className="grid grid-cols-[1fr_4.5rem_1.75rem] items-center gap-2 sm:contents">
            <NumberField
              value={item.amount}
              onChange={(amount) =>
                setList(key, items.map((other) => other.id === item.id ? { ...other, amount } : other))}
            />
            <select
              className="field px-2 py-2 text-sm"
              value={item.currency}
              onChange={(event) =>
                setList(key, items.map((other) => other.id === item.id
                  ? { ...other, currency: event.target.value as Currency } : other))}
            >
              <option value="AED">AED</option>
              <option value="EUR">EUR</option>
            </select>
            <button
              type="button"
              className="text-lg text-neutral-400 hover:text-red-700"
              title="Quitar"
              onClick={() => confirm(`¿Quitar "${item.name}"?`) &&
                setList(key, items.filter((other) => other.id !== item.id))}
            >
              ×
            </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between border-t border-line pt-2 text-sm font-semibold">
        <span>Total</span>
        <Money aed={sumAED(items, rate)} currency={currency} rate={rate} />
      </p>
    </Card>
  )

  return (
    <div className="space-y-4">
      <Card title="Tipo de cambio">
        <label className="grid grid-cols-[1fr_8rem] items-center gap-3">
          <span className="text-sm">1 AED equivale a</span>
          <NumberField
            step="0.001"
            value={rate}
            onChange={(value) => value > 0 && dispatch({ type: 'settings.set', patch: { rate: value } })}
          />
        </label>
        <p className="mt-2 text-xs text-neutral-500">
          Euros por dírham. Se usa para convertir todos los importes entre AED y EUR.
        </p>
      </Card>

      {renderList('incomes', incomes, 'Ingresos base')}
      {renderList('fixedExpenses', fixedExpenses, 'Previsión de gastos fijos')}

      <Card title="Distribución del ingreso">
        <dl className="space-y-1 text-sm">
          {([
            ['Total ingresos', income],
            ['− Gastos fijos', -fixed],
            ['− Ahorros', -savings],
          ] as const).map(([label, amount]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-neutral-600">{label}</dt>
              <dd><Money aed={amount} currency={currency} rate={rate} /></dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-1 font-semibold">
            <dt>= Disponible para gastar</dt>
            <dd><Money aed={income - fixed - savings} currency={currency} rate={rate} /></dd>
          </div>
        </dl>
      </Card>

      <Card title="Categorías">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const used = data.transactions.some((tx) => tx.category === category)
            return (
              <span key={category} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm">
                {category}
                {!used && (
                  <button
                    type="button"
                    className="text-neutral-400 hover:text-red-700"
                    title="Quitar categoría sin usar"
                    onClick={() => dispatch({
                      type: 'settings.set',
                      patch: { categories: categories.filter((other) => other !== category) },
                    })}
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const name = newCategory.trim()
            if (!name || categories.includes(name)) return
            dispatch({ type: 'settings.set', patch: { categories: [...categories, name] } })
            setNewCategory('')
          }}
        >
          <input
            className="field"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Nueva categoría"
          />
          <button type="submit" className="btn-ghost">Añadir</button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">
          Solo se pueden quitar las categorías que no tengan ningún gasto asociado.
        </p>
      </Card>

      <Card title="Copia de seguridad">
        <button type="button" className="btn-ghost w-full" onClick={exportCsv}>
          Descargar movimientos en CSV
        </button>
        <p className="mt-2 text-xs text-neutral-500">
          {data.transactions.length} movimientos guardados. El CSV se abre directamente en Excel.
        </p>
      </Card>
    </div>
  )
}
