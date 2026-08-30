export type Currency = 'AED' | 'EUR'

/** Una línea de ingreso o de gasto fijo del presupuesto. */
export interface LineItem {
  id: string
  name: string
  amount: number
  currency: Currency
  /** Si es true, el gasto se apunta solo al abrir cada mes nuevo. */
  recurring?: boolean
  /** Categoría con la que se apunta cuando es recurrente. */
  category?: string
}

/** Una cuenta de ahorro, fondo de emergencia o provisión. */
export interface SavingsItem {
  id: string
  name: string
  goal: number
  contribution: number
  initialBalance: number
}

export type SavingsGroup = 'accounts' | 'emergency' | 'sinking'

/** Un gasto puntual del registro semanal. */
export interface Transaction {
  id: string
  /** Mes en formato YYYY-MM. */
  month: string
  /** Semana del mes, 1-5, como en el Excel. */
  week: number
  /** Fecha YYYY-MM-DD, opcional: en el Excel muchos gastos no la tenían. */
  date: string | null
  concept: string
  category: string
  amount: number
  currency: Currency
}

export interface WalletData {
  version: number
  year: number
  settings: {
    /** Tipo de cambio AED → EUR. */
    rate: number
    categories: string[]
    /** Primer mes (YYYY-MM) en el que se apuntan solos los gastos recurrentes. */
    recurringFrom?: string
    incomes: LineItem[]
    fixedExpenses: LineItem[]
  }
  savings: Record<SavingsGroup, SavingsItem[]>
  /** Ingresos que sustituyen a los de base en un mes concreto, por id. */
  monthIncomes: Record<string, LineItem[]>
  /** Meses a los que ya se les han añadido los gastos recurrentes. */
  seededMonths?: string[]
  transactions: Transaction[]
}

export type Op =
  | { type: 'tx.add'; tx: Transaction }
  | { type: 'tx.update'; id: string; patch: Partial<Transaction> }
  | { type: 'tx.delete'; id: string }
  | { type: 'settings.set'; patch: Partial<WalletData['settings']> }
  | { type: 'savings.set'; group: SavingsGroup; items: SavingsItem[] }
  | { type: 'monthIncomes.set'; month: string; items: LineItem[] | null }
  | { type: 'months.markSeeded'; month: string }
