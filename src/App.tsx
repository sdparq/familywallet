import { useEffect, useState } from 'react'
import Login from './components/Login'
import MonthView from './components/MonthView'
import SavingsView from './components/SavingsView'
import SettingsView from './components/SettingsView'
import YearView from './components/YearView'
import { CurrencyToggle } from './components/ui'
import { monthKey } from './lib/money'
import { useWallet } from './lib/store'
import type { Currency } from './lib/types'

const TABS = [
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
  { id: 'savings', label: 'Ahorros' },
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
        <p className="text-ink/60">{status === 'loading' ? 'Cargando…' : error}</p>
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
      <header className="sticky top-0 z-20 bg-ink text-white shadow-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Dubai · {data.year}</p>
            <h1 className="text-lg font-semibold leading-tight">Family Wallet</h1>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-[11px] text-white/50">Guardando…</span>}
            <CurrencyToggle value={currency} onChange={setCurrency} />
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-white/20 px-3 py-1 text-xs text-white/70 hover:text-white"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-2 pb-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                tab === item.id ? 'bg-sand text-ink' : 'text-white/60 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <p className="mx-auto mt-3 max-w-4xl rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        {tab === 'month' && <MonthView currency={currency} month={month} onMonthChange={setMonth} />}
        {tab === 'year' && <YearView currency={currency} onOpenMonth={(key) => { setMonth(key); setTab('month') }} />}
        {tab === 'savings' && <SavingsView currency={currency} />}
        {tab === 'settings' && <SettingsView currency={currency} />}
      </main>
    </div>
  )
}
