import { useEffect, useState } from 'react'
import Login from './components/Login'
import MonthView from './components/MonthView'
import SettingsView from './components/SettingsView'
import YearView from './components/YearView'
import { CurrencyToggle } from './components/ui'
import { monthKey } from './lib/money'
import { useWallet } from './lib/store'
import type { Currency } from './lib/types'

const TABS = [
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
  { id: 'settings', label: 'Ajustes' },
] as const

type TabId = (typeof TABS)[number]['id']

const CURRENCY_STORAGE = 'familywallet:currency'

export default function App() {
  const { data, status, error, saving, signOut, reload } = useWallet()
  const [tab, setTab] = useState<TabId>('month')
  const [currency, setCurrency] = useState<Currency>(
    () => (localStorage.getItem(CURRENCY_STORAGE) as Currency | null) ?? 'AED',
  )
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return monthKey(today.getFullYear(), today.getMonth())
  })

  useEffect(() => localStorage.setItem(CURRENCY_STORAGE, currency), [currency])

  // El mes de hoy puede caer fuera del año del presupuesto: se recoloca al abrir
  useEffect(() => {
    if (data && !month.startsWith(String(data.year))) setMonth(monthKey(data.year, 0))
  }, [data, month])

  if (status === 'locked') return <Login />

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-neutral-500">{status === 'loading' ? 'Cargando…' : error}</p>
        {status === 'error' && (
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={reload}>Reintentar</button>
            <button type="button" className="btn-ghost" onClick={signOut}>Salir</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 pt-3">
          <h1 className="font-semibold">
            Family Wallet <span className="font-normal text-neutral-400">{data.year}</span>
          </h1>
          <div className="flex items-center gap-2">
            {saving && <span className="text-[11px] text-neutral-400">Guardando…</span>}
            <CurrencyToggle value={currency} onChange={setCurrency} />
            <button
              type="button"
              onClick={signOut}
              className="px-1 text-xs text-neutral-500 underline hover:text-neutral-900"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-4 px-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 py-2 text-sm transition ${
                tab === item.id
                  ? 'border-neutral-900 font-medium text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <p className="mx-auto mt-3 max-w-4xl rounded-md bg-rose-100 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        {tab === 'month' && <MonthView currency={currency} month={month} onMonthChange={setMonth} />}
        {tab === 'year' && <YearView currency={currency} onOpenMonth={(key) => { setMonth(key); setTab('month') }} />}
        {tab === 'settings' && <SettingsView currency={currency} />}
      </main>
    </div>
  )
}
