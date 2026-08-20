import type { Currency, Transaction } from './types'

export interface Suggestion {
  concept: string
  category: string
  currency: Currency
  count: number
}

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Los conceptos que más se repiten, con la categoría y la moneda que se les puso
 * la última vez. Sirven para apuntar un gasto habitual sin escribir nada.
 */
export const frequentConcepts = (transactions: Transaction[], limit = 6): Suggestion[] => {
  const groups = new Map<string, { concept: string; count: number; last: Transaction }>()
  for (const tx of transactions) {
    const key = normalize(tx.concept)
    if (!key || key === 'sin concepto') continue
    const group = groups.get(key)
    // El más reciente manda: es el que mejor refleja cómo se apunta ahora
    if (!group) groups.set(key, { concept: tx.concept.trim(), count: 1, last: tx })
    else {
      group.count += 1
      if ((tx.date ?? '') >= (group.last.date ?? '')) group.last = tx
    }
  }
  return [...groups.values()]
    .filter((group) => group.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((group) => ({
      concept: group.concept,
      category: group.last.category,
      currency: group.last.currency,
      count: group.count,
    }))
}

/** Todos los conceptos distintos ya usados, para el autocompletado del campo. */
export const knownConcepts = (transactions: Transaction[]): string[] => {
  const seen = new Map<string, string>()
  for (const tx of transactions) {
    const key = normalize(tx.concept)
    if (key && !seen.has(key)) seen.set(key, tx.concept.trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'))
}

/** La categoría más usada: mejor punto de partida que la primera de la lista. */
export const commonCategory = (transactions: Transaction[], fallback: string): string => {
  const counts = new Map<string, number>()
  for (const tx of transactions) counts.set(tx.category, (counts.get(tx.category) ?? 0) + 1)
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : fallback
}
