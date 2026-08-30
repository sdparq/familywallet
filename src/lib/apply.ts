import type { Op, SavingsGroup, Transaction, WalletData } from './types'

const SAVINGS_GROUPS: SavingsGroup[] = ['accounts', 'emergency', 'sinking']

const isTransaction = (value: unknown): value is Transaction => {
  const tx = value as Transaction
  return Boolean(
    tx && typeof tx.id === 'string' && typeof tx.month === 'string' &&
    typeof tx.concept === 'string' && typeof tx.category === 'string' &&
    typeof tx.amount === 'number' && Number.isFinite(tx.amount) &&
    (tx.currency === 'AED' || tx.currency === 'EUR'),
  )
}

/**
 * Aplica una operación sobre los datos. La usan el cliente (para pintar el cambio
 * al instante) y la función de Netlify (para guardarlo), así los dos coinciden.
 */
export const applyOp = (data: WalletData, op: Op): WalletData => {
  switch (op.type) {
    case 'tx.add': {
      if (!isTransaction(op.tx)) throw new Error('Movimiento inválido')
      // Añadir dos veces el mismo id (un reintento de red) no debe duplicar el gasto
      const rest = data.transactions.filter((tx) => tx.id !== op.tx.id)
      return { ...data, transactions: [...rest, op.tx] }
    }
    case 'tx.update':
      return {
        ...data,
        transactions: data.transactions.map((tx) =>
          tx.id === op.id ? { ...tx, ...op.patch, id: tx.id } : tx),
      }
    case 'tx.delete':
      return { ...data, transactions: data.transactions.filter((tx) => tx.id !== op.id) }
    case 'settings.set':
      return { ...data, settings: { ...data.settings, ...op.patch } }
    case 'savings.set': {
      if (!SAVINGS_GROUPS.includes(op.group)) throw new Error('Grupo de ahorro desconocido')
      return { ...data, savings: { ...data.savings, [op.group]: op.items } }
    }
    case 'months.markSeeded': {
      const seeded = data.seededItems ?? {}
      const already = seeded[op.month] ?? []
      const merged = [...new Set([...already, ...op.itemIds])]
      return { ...data, seededItems: { ...seeded, [op.month]: merged } }
    }
    case 'monthIncomes.set': {
      const monthIncomes = { ...data.monthIncomes }
      if (op.items) monthIncomes[op.month] = op.items
      else delete monthIncomes[op.month]
      return { ...data, monthIncomes }
    }
    default:
      throw new Error(`Operación desconocida: ${(op as { type: string }).type}`)
  }
}
