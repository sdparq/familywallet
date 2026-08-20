import { useRef, useState } from 'react'
import { extractMovements } from '../lib/api'
import type { DetectedMovement } from '../lib/api'
import { framesFromFile } from '../lib/frames'
import type { Frame } from '../lib/frames'
import { weekOfMonth } from '../lib/money'
import { useData } from '../lib/store'
import type { Currency, Transaction } from '../lib/types'
import { NumberField } from './ui'

/** Capturas por petición: grupos pequeños para no agotar el tiempo de la función. */
const BATCH_SIZE = 3

interface Candidate extends DetectedMovement {
  key: string
  selected: boolean
  /** Ya existe un gasto igual en el mes: se deja desmarcado para no duplicarlo. */
  alreadyLogged: boolean
}

type Stage = 'pick' | 'reading' | 'review'

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

const dedupeKey = (movement: DetectedMovement) =>
  `${normalize(movement.concepto)}|${movement.importe.toFixed(2)}|${movement.moneda}`

export default function ImportDialog({ month, onClose }: { month: string; onClose: () => void }) {
  const { data, key, dispatch } = useData()
  const [stage, setStage] = useState<Stage>('pick')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  const existing = data.transactions.filter((tx) => tx.month === month)

  const looksLogged = (movement: DetectedMovement) =>
    existing.some((tx) =>
      tx.currency === movement.moneda &&
      Math.abs(tx.amount - movement.importe) < 0.01 &&
      (normalize(tx.concept) === normalize(movement.concepto) ||
        normalize(tx.concept).includes(normalize(movement.concepto)) ||
        normalize(movement.concepto).includes(normalize(tx.concept))))

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setStage('reading')
    setError(null)
    try {
      const frames: Frame[] = []
      for (const file of Array.from(files)) {
        setProgress(`Preparando ${file.name}…`)
        frames.push(...await framesFromFile(file, (done, total) =>
          setProgress(`Extrayendo fotogramas de ${file.name}: ${done} de ${total}`)))
      }

      const batches: Frame[][] = []
      for (let i = 0; i < frames.length; i += BATCH_SIZE) batches.push(frames.slice(i, i + BATCH_SIZE))

      const found = new Map<string, DetectedMovement>()
      for (const [index, images] of batches.entries()) {
        setProgress(`Leyendo los gastos… (${index + 1} de ${batches.length})`)
        const movements = await extractMovements(key, {
          images,
          month,
          categories: data.settings.categories,
        })
        // El mismo gasto aparece en varios fotogramas mientras se hace scroll
        for (const movement of movements) found.set(dedupeKey(movement), movement)
      }

      const list = [...found.values()].map((movement) => ({
        ...movement,
        key: dedupeKey(movement),
        alreadyLogged: looksLogged(movement),
        selected: !looksLogged(movement),
      }))
      setCandidates(list)
      setStage('review')
    } catch (caught) {
      setError((caught as Error).message)
      setStage('pick')
    }
  }

  const patch = (itemKey: string, changes: Partial<Candidate>) =>
    setCandidates((current) =>
      current.map((item) => (item.key === itemKey ? { ...item, ...changes } : item)))

  const confirm = () => {
    const chosen = candidates.filter((item) => item.selected)
    if (chosen.length === 0) return onClose()

    const unknownCategories = [...new Set(chosen.map((item) => item.categoria))]
      .filter((category) => !data.settings.categories.includes(category))
    if (unknownCategories.length > 0) {
      dispatch({
        type: 'settings.set',
        patch: { categories: [...data.settings.categories, ...unknownCategories] },
      })
    }

    dispatch(...chosen.map((item) => {
      const date = item.fecha && item.fecha.startsWith(month) ? item.fecha : null
      const tx: Transaction = {
        id: crypto.randomUUID(),
        month,
        week: date ? weekOfMonth(date) : 1,
        date,
        concept: item.concepto.trim() || 'Sin concepto',
        category: item.categoria,
        amount: item.importe,
        currency: item.moneda,
      }
      return { type: 'tx.add' as const, tx }
    }))
    onClose()
  }

  const selectedCount = candidates.filter((item) => item.selected).length

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-lg border border-line bg-white sm:rounded-lg"
      >
        <header className="border-b border-line p-4">
          <h2 className="font-semibold">Importar desde foto o vídeo</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Los gastos se añadirán al mes seleccionado.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {stage === 'pick' && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Sube una captura de pantalla o una grabación haciendo scroll por los movimientos
                del banco. Se leen y se te muestran para que los revises antes de guardarlos.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(event) => void handleFiles(event.target.files)}
              />
              <button type="button" className="btn-primary w-full py-3" onClick={() => fileInput.current?.click()}>
                Elegir foto o vídeo
              </button>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <p className="text-xs text-neutral-500">
                Las imágenes se envían a la API de Claude solo para leer los movimientos.
                De un vídeo se toman como mucho 16 fotogramas y se descartan los repetidos.
              </p>
            </div>
          )}

          {stage === 'reading' && (
            <div className="py-10 text-center">
              <p className="text-sm text-neutral-600">{progress}</p>
              <p className="mt-2 text-xs text-neutral-400">Puede tardar medio minuto.</p>
            </div>
          )}

          {stage === 'review' && (
            candidates.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-500">
                No se ha reconocido ningún gasto. Prueba con una captura más nítida.
              </p>
            ) : (
              <ul className="space-y-2">
                {candidates.map((item) => (
                  <li key={item.key} className="rounded-md border border-line p-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-2.5 h-4 w-4 shrink-0"
                        checked={item.selected}
                        onChange={(event) => patch(item.key, { selected: event.target.checked })}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          className="field text-sm"
                          value={item.concepto}
                          onChange={(event) => patch(item.key, { concepto: event.target.value })}
                        />
                        <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                          <NumberField
                            value={item.importe}
                            onChange={(importe) => patch(item.key, { importe })}
                          />
                          <select
                            className="field px-2 py-2 text-sm"
                            value={item.moneda}
                            onChange={(event) => patch(item.key, { moneda: event.target.value as Currency })}
                          >
                            <option value="AED">AED</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                        <select
                          className="field text-sm"
                          value={item.categoria}
                          onChange={(event) => patch(item.key, { categoria: event.target.value })}
                        >
                          {[...new Set([...data.settings.categories, item.categoria])].map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                        <p className="text-xs text-neutral-500">
                          {item.fecha ?? 'Sin fecha'}
                          {item.alreadyLogged && ' · ya parece registrado este mes'}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>

        <footer className="flex gap-2 border-t border-line p-4">
          <button type="button" className="btn-ghost ml-auto" onClick={onClose}>
            {stage === 'review' ? 'Cancelar' : 'Cerrar'}
          </button>
          {stage === 'review' && (
            <button type="button" className="btn-primary" onClick={confirm} disabled={selectedCount === 0}>
              Añadir {selectedCount} {selectedCount === 1 ? 'gasto' : 'gastos'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
