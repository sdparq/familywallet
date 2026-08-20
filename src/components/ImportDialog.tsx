import { useMemo, useState } from 'react'
import { weekOfMonth } from '../lib/money'
import { guessCategory, parseStatement } from '../lib/parse'
import type { ParsedMovement } from '../lib/parse'
import { useData } from '../lib/store'
import type { Currency, Transaction } from '../lib/types'
import { NumberField } from './ui'

interface Candidate extends ParsedMovement {
  id: string
  category: string
  selected: boolean
  /** Ya hay un gasto igual en el mes: se deja desmarcado para no duplicarlo. */
  alreadyLogged: boolean
}

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

const EXAMPLE = `Fecha;Concepto;Importe
12/08/2026;Carrefour MOE;-182,40
13/08/2026;Careem;-42,75`

export default function ImportDialog({ month, onClose }: { month: string; onClose: () => void }) {
  const { data, dispatch } = useData()
  const [text, setText] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  const history = useMemo(
    () => data.transactions.map((tx) => ({ concept: tx.concept, category: tx.category })),
    [data.transactions],
  )

  const read = () => {
    const existing = data.transactions.filter((tx) => tx.month === month)
    const looksLogged = (movement: ParsedMovement) =>
      existing.some((tx) =>
        tx.currency === movement.currency &&
        Math.abs(tx.amount - movement.amount) < 0.01 &&
        normalize(tx.concept) === normalize(movement.concept))

    setCandidates(parseStatement(text, data.year).map((movement, index) => ({
      ...movement,
      id: `${index}-${movement.concept}-${movement.amount}`,
      category: guessCategory(movement.concept, history) ?? 'Otros',
      alreadyLogged: looksLogged(movement),
      // Los ingresos y lo ya apuntado se muestran, pero no entran por defecto
      selected: movement.kind === 'gasto' && !looksLogged(movement),
    })))
    setReviewing(true)
  }

  const patch = (id: string, changes: Partial<Candidate>) =>
    setCandidates((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  const confirm = () => {
    const chosen = candidates.filter((item) => item.selected)
    if (chosen.length === 0) return onClose()

    dispatch(...chosen.map((item) => {
      const date = item.date && item.date.startsWith(month) ? item.date : null
      const tx: Transaction = {
        id: crypto.randomUUID(),
        month,
        week: date ? weekOfMonth(date) : 1,
        date,
        concept: item.concept.trim() || 'Sin concepto',
        category: item.category,
        amount: item.amount,
        currency: item.currency,
      }
      return { type: 'tx.add' as const, tx }
    }))
    onClose()
  }

  const selected = candidates.filter((item) => item.selected).length
  const setAll = (value: boolean) =>
    setCandidates((current) => current.map((item) => ({ ...item, selected: value })))

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-lg border border-line bg-white sm:rounded-lg"
      >
        <header className="border-b border-line p-4">
          <h2 className="font-semibold">Pegar movimientos del banco</h2>
          <p className="mt-0.5 text-sm text-neutral-500">Se añadirán al mes seleccionado.</p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!reviewing ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Copia la lista de movimientos de la web o la app del banco y pégala aquí.
                Vale un CSV descargado, una tabla copiada o el texto tal cual.
              </p>
              <textarea
                autoFocus
                rows={9}
                className="field font-mono text-xs"
                placeholder={EXAMPLE}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <p className="text-xs text-neutral-500">
                Se lee todo en tu móvil: no se envía a ningún sitio y no cuesta nada.
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              No se ha reconocido ningún movimiento. Prueba a pegar solo las filas,
              con el concepto y el importe.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-neutral-500">{candidates.length} movimientos leídos</span>
                <span className="flex gap-3">
                  <button type="button" className="underline hover:text-neutral-900" onClick={() => setAll(true)}>
                    Marcar todos
                  </button>
                  <button type="button" className="underline hover:text-neutral-900" onClick={() => setAll(false)}>
                    Ninguno
                  </button>
                </span>
              </div>
              <ul className="space-y-2">
                {candidates.map((item) => (
                  <li key={item.id} className="rounded-md border border-line p-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-2.5 h-4 w-4 shrink-0"
                        checked={item.selected}
                        onChange={(event) => patch(item.id, { selected: event.target.checked })}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          className="field text-sm"
                          value={item.concept}
                          onChange={(event) => patch(item.id, { concept: event.target.value })}
                        />
                        <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                          <NumberField
                            value={item.amount}
                            onChange={(amount) => patch(item.id, { amount })}
                          />
                          <select
                            className="field px-2 py-2 text-sm"
                            value={item.currency}
                            onChange={(event) => patch(item.id, { currency: event.target.value as Currency })}
                          >
                            <option value="AED">AED</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                        <select
                          className="field text-sm"
                          value={item.category}
                          onChange={(event) => patch(item.id, { category: event.target.value })}
                        >
                          {data.settings.categories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                        <p className="text-xs text-neutral-500">
                          {item.date ?? 'Sin fecha'}
                          {item.kind === 'ingreso' && ' · parece un ingreso'}
                          {item.alreadyLogged && ' · ya está apuntado este mes'}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <footer className="flex gap-2 border-t border-line p-4">
          {reviewing && (
            <button type="button" className="btn-ghost" onClick={() => setReviewing(false)}>
              Volver
            </button>
          )}
          <button type="button" className="btn-ghost ml-auto" onClick={onClose}>Cancelar</button>
          {reviewing ? (
            <button type="button" className="btn-primary" onClick={confirm} disabled={selected === 0}>
              Añadir {selected}
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={read} disabled={!text.trim()}>
              Leer movimientos
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
