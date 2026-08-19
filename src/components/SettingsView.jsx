import { useRef, useState } from 'react'
import { MONTH_NAMES, activeTx, monthKey } from '../lib/calc.js'
import { Card, NumberInput } from './ui.jsx'
import { getKey, setKey, clearKey } from '../lib/api.js'

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

export default function SettingsView({ state, actions, display, setDisplay, sync, status }) {
  const fileRef = useRef(null)
  const [catText, setCatText] = useState(state.categories.join('\n'))
  const [keyValue, setKeyValue] = useState(getKey())
  const [msg, setMsg] = useState('')

  const exportJson = () => download(`familywallet-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(state, null, 2), 'application/json')

  const exportCsv = () => {
    const head = ['Mes', 'Semana', 'Fecha', 'Concepto', 'Categoria', 'Importe', 'Moneda']
    const lines = [head.join(',')]
    for (let m = 1; m <= 12; m += 1) {
      const key = monthKey(state.settings.year, m)
      for (const t of activeTx(state, key)) {
        lines.push([MONTH_NAMES[m - 1], t.week, t.date || '', t.concept, t.category, t.amount, t.currency].map(csvCell).join(','))
      }
    }
    download(`gastos-${state.settings.year}.csv`, `﻿${lines.join('\n')}`, 'text/csv;charset=utf-8')
  }

  const importJson = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!parsed.transactions) throw new Error('formato')
        if (!confirm('Esto reemplaza todos los datos actuales. ¿Seguro?')) return
        actions.replaceState(parsed)
        setMsg('Datos importados.')
      } catch {
        setMsg('Ese archivo no es una copia válida.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const saveKey = () => {
    if (keyValue.trim()) setKey(keyValue.trim())
    else clearKey()
    sync.pull()
    setMsg('Clave guardada.')
  }

  return (
    <>
      {msg && <div className="notice">{msg}</div>}

      <Card title="General">
        <div className="form-grid">
          <div className="field">
            <label>Tipo de cambio (1 AED en €)</label>
            <NumberInput value={state.settings.rate} step="0.001"
              onChange={(rate) => actions.setSettings({ rate: rate || 0.24 })} />
          </div>
          <div className="field">
            <label>Año</label>
            <NumberInput value={state.settings.year} step="1"
              onChange={(year) => actions.setSettings({ year: Math.round(year) || new Date().getFullYear() })} />
          </div>
          <div className="field">
            <label>Moneda que se muestra</label>
            <select value={display} onChange={(e) => setDisplay(e.target.value)}>
              <option value="AED">AED (dírhams)</option>
              <option value="EUR">EUR (euros)</option>
            </select>
          </div>
        </div>
        <p className="hint">
          Cada movimiento guarda su moneda original. El tipo de cambio solo se usa para mostrar los totales
          en la moneda elegida — hoy 1 AED ≈ {state.settings.rate} €.
        </p>
      </Card>

      <Card title="Categorías">
        <textarea rows={10} value={catText} onChange={(e) => setCatText(e.target.value)} />
        <div className="inline" style={{ marginTop: 10 }}>
          <button className="btn btn-primary btn-sm"
            onClick={() => {
              const list = [...new Set(catText.split('\n').map((c) => c.trim()).filter(Boolean))]
              actions.setCategories(list)
              setCatText(list.join('\n'))
              setMsg('Categorías guardadas.')
            }}>Guardar categorías</button>
          <span className="hint">Una por línea. Los gastos ya guardados conservan su categoría aunque la borres.</span>
        </div>
      </Card>

      <Card title="Sincronización entre los dos">
        <div className="form-grid">
          <div className="field wide">
            <label>Clave compartida</label>
            <input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)}
              placeholder="La misma en tu móvil y en el de Bea" autoComplete="current-password" />
          </div>
          <button className="btn btn-primary" onClick={saveKey}>Guardar clave</button>
          <button className="btn" onClick={() => sync.pull()}>Recargar del servidor</button>
        </div>
        <p className="hint">
          Estado: <strong>{status}</strong>. Con la clave correcta los datos se guardan en el servidor y los veis
          los dos; sin ella la app sigue funcionando pero solo en este dispositivo.
        </p>
      </Card>

      <Card title="Copias de seguridad">
        <div className="inline">
          <button className="btn" onClick={exportJson}>Exportar copia (JSON)</button>
          <button className="btn" onClick={exportCsv}>Exportar gastos (CSV para Excel)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar copia</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={importJson} style={{ display: 'none' }} />
        </div>
        <p className="hint">El CSV se abre directamente en Excel con una fila por gasto.</p>
      </Card>
    </>
  )
}
