import { useEffect, useState } from 'react'
import { weekOfMonth } from '../lib/money'
import { useData } from '../lib/store'
import type { Currency, Transaction } from '../lib/types'
import { NumberField } from './ui'

const NEW_CATEGORY = '__nueva__'

const blank = (month: string, category: string): Transaction => {
  const today = new Date().toLocaleDateString('sv')
  const isCurrentMonth = today.startsWith(month)
  return {
    id: crypto.randomUUID(),
    month,
    week: isCurrentMonth ? weekOfMonth(today) : 1,
    date: isCurrentMonth ? today : null,
    concept: '',
    category,
    amount: 0,
    currency: 'AED',
  }
}

export default function ExpenseDialog({ month, editing, onClose }: {
  month: string
  /** Movimiento a editar, o null para crear uno nuevo. */
  editing: Transaction | null
  onClose: () => void
}) {
  const { data, dispatch } = useData()
  const [draft, setDraft] = useState<Transaction>(() => editing ?? blank(month, data.settings.categories[0]))
  const [newCategory, setNewCategory] = useState('')
  const isNewCategory = draft.category === NEW_CATEGORY

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  const patch = (changes: Partial<Transaction>) => setDraft((current) => ({ ...current, ...changes }))

  const setDate = (value: string) => {
    if (!value) return patch({ date: null })
    // La fecha manda: recoloca el gasto en su mes y su semana, como en el Excel
    patch({ date: value, month: value.slice(0, 7), week: weekOfMonth(value) })
  }

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    const category = isNewCategory ? newCategory.trim() : draft.category
    if (!category) return
    const tx: Transaction = { ...draft, concept: draft.concept.trim() || 'Sin concepto', category }

    const categories = data.settings.categories.includes(category)
      ? null
      : [...data.settings.categories, category]

    if (categories) dispatch({ type: 'settings.set', patch: { categories } })
    dispatch(editing ? { type: 'tx.update', id: tx.id, patch: tx } : { type: 'tx.add', tx })
    onClose()
  }

  const remove = () => {
    if (!editing || !confirm(`¿Borrar "${editing.concept}"?`)) return
    dispatch({ type: 'tx.delete', id: editing.id })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-t-lg border border-line bg-white p-4 sm:rounded-lg"
      >
        <h2 className="text-lg font-semibold">{editing ? 'Editar gasto' : 'Nuevo gasto'}</h2>

        <div>
          <label className="label" htmlFor="concept">Concepto</label>
          <input
            id="concept"
            autoFocus
            className="field"
            value={draft.concept}
            onChange={(event) => patch({ concept: event.target.value })}
            placeholder="Carrefour, Careem, cena…"
          />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="label" htmlFor="amount">Importe</label>
            <NumberField
              id="amount"
              value={draft.amount}
              onChange={(amount) => patch({ amount })}
            />
          </div>
          <div>
            <span className="label">Moneda</span>
            <div className="inline-flex rounded-md border border-line p-0.5">
              {(['AED', 'EUR'] as Currency[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => patch({ currency: option })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    draft.currency === option ? 'bg-neutral-900 text-white' : 'text-neutral-500'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="category">Categoría</label>
          <select
            id="category"
            className="field"
            value={draft.category}
            onChange={(event) => patch({ category: event.target.value })}
          >
            {data.settings.categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
            <option value={NEW_CATEGORY}>+ Nueva categoría…</option>
          </select>
          {isNewCategory && (
            <input
              className="field mt-2"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Nombre de la categoría"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="date">Fecha (opcional)</label>
            <input
              id="date"
              type="date"
              className="field"
              value={draft.date ?? ''}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="week">Semana</label>
            <select
              id="week"
              className="field"
              value={draft.week}
              onChange={(event) => patch({ week: Number(event.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((week) => (
                <option key={week} value={week}>Semana {week}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {editing && (
            <button type="button" className="btn-ghost text-red-700" onClick={remove}>Borrar</button>
          )}
          <button type="button" className="btn-ghost ml-auto" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  )
}
