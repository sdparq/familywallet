import type { Currency, LineItem, Transaction, WalletData } from './types'

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const monthKey = (year: number, index: number) => `${year}-${String(index + 1).padStart(2, '0')}`

export const monthLabel = (key: string) => {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`
}

/** Semana del mes tal y como las numeraba el Excel: bloques de 7 días, la 5ª recoge el resto. */
export const weekOfMonth = (isoDate: string) => Math.min(5, Math.ceil(Number(isoDate.slice(8, 10)) / 7))

export const toAED = (amount: number, currency: Currency, rate: number) =>
  currency === 'AED' ? amount : amount / rate

export const toEUR = (amount: number, currency: Currency, rate: number) =>
  currency === 'EUR' ? amount : amount * rate

export const sumAED = (items: Array<LineItem | Transaction>, rate: number) =>
  items.reduce((total, item) => total + toAED(item.amount, item.currency, rate), 0)

/** Sin símbolo de moneda: para tablas donde la moneda ya va en la cabecera. */
export const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(amount)

export const formatMoney = (amount: number, currency: Currency) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
  }).format(amount)

/** Ingresos del mes: los de base, sustituidos por los ajustes guardados para ese mes. */
export const incomesForMonth = (data: WalletData, month: string): LineItem[] => {
  const overrides = data.monthIncomes[month] ?? []
  return data.settings.incomes.map((income) => overrides.find((o) => o.id === income.id) ?? income)
}

export interface MonthSummary {
  income: number
  fixed: number
  savings: number
  /** Presupuesto para gastos variables: ingresos − fijos − ahorro. */
  budget: number
  spent: number
  remaining: number
}

/** Todos los importes del resumen en AED; la vista los convierte a EUR con el tipo. */
export const summarizeMonth = (data: WalletData, month: string): MonthSummary => {
  const { rate } = data.settings
  const income = sumAED(incomesForMonth(data, month), rate)
  const fixed = sumAED(data.settings.fixedExpenses, rate)
  const savings = savingsContribution(data)
  const budget = income - fixed - savings
  const spent = sumAED(data.transactions.filter((tx) => tx.month === month), rate)
  return { income, fixed, savings, budget, spent, remaining: budget - spent }
}

export const savingsContribution = (data: WalletData) =>
  [...data.savings.accounts, ...data.savings.emergency].reduce((total, item) => total + item.contribution, 0)

export interface CategoryTotal {
  category: string
  count: number
  total: number
}

/** Totales por categoría de un mes, en AED y de mayor a menor gasto. */
export const categoryTotals = (data: WalletData, month: string): CategoryTotal[] => {
  const totals = new Map<string, CategoryTotal>()
  for (const tx of data.transactions) {
    if (tx.month !== month) continue
    const entry = totals.get(tx.category) ?? { category: tx.category, count: 0, total: 0 }
    entry.count += 1
    entry.total += toAED(tx.amount, tx.currency, data.settings.rate)
    totals.set(tx.category, entry)
  }
  return [...totals.values()].sort((a, b) => b.total - a.total)
}
