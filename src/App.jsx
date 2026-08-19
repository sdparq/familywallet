import { useState } from 'react'
import { useWallet } from './lib/store.js'
import MonthView from './components/MonthView.jsx'
import YearView from './components/YearView.jsx'
import BudgetView from './components/BudgetView.jsx'
import SavingsView from './components/SavingsView.jsx'
import SettingsView from './components/SettingsView.jsx'

const TABS = [
  { id: 'mes', label: 'Mes' },
  { id: 'anual', label: 'Anual' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'ahorros', label: 'Ahorros' },
  { id: 'ajustes', label: 'Ajustes' },
]

const STATUS = {
  idle: { text: 'Sincronizado', cls: '' },
  syncing: { text: 'Cargando…', cls: '' },
  saving: { text: 'Guardando…', cls: '' },
  offline: { text: 'Solo este dispositivo', cls: 'status-warn' },
  auth: { text: 'Clave incorrecta', cls: 'status-error' },
  error: { text: 'Sin conexión', cls: 'status-error' },
}

export default function App() {
  const { state, actions, status, sync } = useWallet()
  const [tab, setTab] = useState('mes')
  const [display, setDisplay] = useState(state.settings.display || 'AED')

  const badge = STATUS[status] || STATUS.idle
  const shared = { state, actions, display }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <span className="brand-emoji">👛</span>
            <div>
              <h1>Family Wallet</h1>
              <small>Dubai · {state.settings.year}</small>
            </div>
          </div>
          <button className="chip" data-on={display === 'EUR'} onClick={() => setDisplay(display === 'AED' ? 'EUR' : 'AED')}>
            {display === 'AED' ? 'AED' : 'EUR'}
          </button>
          <button className={`chip ${badge.cls}`} onClick={() => sync.pull()} title="Volver a sincronizar">
            {badge.text}
          </button>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} className="tab" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {status === 'auth' && (
        <div className="notice bad">
          La clave compartida no es correcta, así que no se está guardando en el servidor.
          Ve a <strong>Ajustes → Sincronización</strong> para corregirla.
        </div>
      )}

      {tab === 'mes' && <MonthView {...shared} />}
      {tab === 'anual' && <YearView {...shared} />}
      {tab === 'presupuesto' && <BudgetView {...shared} />}
      {tab === 'ahorros' && <SavingsView {...shared} />}
      {tab === 'ajustes' && (
        <SettingsView {...shared} setDisplay={setDisplay} sync={sync} status={badge.text} />
      )}
    </div>
  )
}
