import type { Transaction } from './types'

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Gastos que podrían estar apuntados dos veces dentro del mismo mes: mismo
 * concepto, mismo importe y misma moneda.
 *
 * No se exige que coincida la fecha, porque la mayoría de los movimientos que
 * vienen del Excel no la tienen. Es una sospecha, no una certeza: un mismo
 * comercio puede cobrar lo mismo dos veces de verdad, así que solo se resalta.
 */
export const findDuplicates = (transactions: Transaction[]): Set<string> => {
  const groups = new Map<string, string[]>()
  for (const tx of transactions) {
    const key = `${normalize(tx.concept)}|${tx.amount.toFixed(2)}|${tx.currency}`
    groups.set(key, [...(groups.get(key) ?? []), tx.id])
  }

  const flagged = new Set<string>()
  for (const ids of groups.values()) {
    if (ids.length > 1) for (const id of ids) flagged.add(id)
  }
  return flagged
}
