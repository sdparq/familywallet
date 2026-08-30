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
  spent: number
  /** Ingresos menos lo gastado. Solo cuenta lo apuntado, no previsiones. */
  balance: number
  /** false si el mes no tiene ningún movimiento: entonces no hay nada que contar. */
  hasData: boolean
}

/** Todos los importes en AED; la vista los convierte a EUR con el tipo. */
export const summarizeMonth = (data: WalletData, month: string): MonthSummary => {
  const { rate } = data.settings
  const income = sumAED(incomesForMonth(data, month), rate)
  const movements = data.transactions.filter((tx) => tx.month === month)
  const spent = sumAED(movements, rate)
  return { income, spent, balance: income - spent, hasData: movements.length > 0 }
}

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

export interface DayGroup {
  key: string
  label: string
  /** Día del mes al que se ancla el grupo, para ordenarlos entre sí. */
  anchor: string
  dated: boolean
  items: Transaction[]
  total: number
}

const DAY_FORMAT = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** 'YYYY-MM-DD' como fecha local: con `new Date(iso)` el día se desplaza por la zona horaria. */
const localDate = (iso: string) =>
  new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))

/**
 * Agrupa los gastos de un mes por día, del más reciente al más antiguo.
 * Los que vienen del Excel sin fecha se agrupan por su semana y se colocan
 * donde caía esa semana, en lugar de inventarles un día.
 */
export const groupByDay = (transactions: Transaction[], month: string, rate: number): DayGroup[] => {
  const groups = new Map<string, DayGroup>()

  for (const tx of transactions) {
    const dated = Boolean(tx.date)
    const key = tx.date ?? `semana-${tx.week}`
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        dated,
        label: dated
          ? capitalize(DAY_FORMAT.format(localDate(tx.date!)))
          : `Semana ${tx.week} · sin fecha`,
        anchor: dated ? tx.date! : `${month}-${String((tx.week - 1) * 7 + 1).padStart(2, '0')}`,
        items: [],
        total: 0,
      }
      groups.set(key, group)
    }
    group.items.push(tx)
    group.total += toAED(tx.amount, tx.currency, rate)
  }

  return [...groups.values()].sort((a, b) =>
    // Mismo día: primero el grupo con fecha, después el bloque sin fechar
    b.anchor.localeCompare(a.anchor) || Number(b.dated) - Number(a.dated))
}
