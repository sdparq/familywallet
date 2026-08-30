import type { LineItem, WalletData } from './types'

/**
 * Gastos que se repiten todos los meses y se apuntan solos. Los importes y las
 * categorías son los que ya usaba la pareja en el Excel.
 */
const RECURRING: LineItem[] = [
  { id: 'rec-linkedin', name: 'LinkedIn', amount: 22.99, currency: 'AED', recurring: true, category: 'Bea' },
  { id: 'rec-claude', name: 'Claude suscripción', amount: 418.26, currency: 'AED', recurring: true, category: 'Santi' },
  { id: 'rec-google-one', name: 'Google One', amount: 21.99, currency: 'EUR', recurring: true, category: 'Santi' },
  { id: 'rec-seguro-santi', name: 'Seguro España Santi', amount: 54.67, currency: 'EUR', recurring: true, category: 'Salud' },
  { id: 'rec-seguro-bea', name: 'Seguro España Bea', amount: 67.79, currency: 'EUR', recurring: true, category: 'Salud' },
  { id: 'rec-fertilitas', name: 'Fertilitas', amount: 151.25, currency: 'EUR', recurring: true, category: 'Salud' },
]

/** Gastos que ya venían del Excel y también se cobran todos los meses. */
const RECURRING_FROM_EXCEL: Record<string, string> = {
  'alquiler-piso': 'Alquiler piso',
}

/** Desde agosto de 2026: los meses anteriores ya tenían estos gastos apuntados. */
const RECURRING_FROM = '2026-08'

export const CURRENT_VERSION = 3

/**
 * Pone al día unos datos guardados con una versión anterior. Cada paso se aplica
 * una sola vez, así lo que el usuario borre después no reaparece.
 */
export const migrate = (data: WalletData): WalletData => {
  const version = data.version ?? 1
  if (version >= CURRENT_VERSION) return data

  const existing = new Set(data.settings.fixedExpenses.map((item) => item.id))
  const fixedExpenses = [
    ...data.settings.fixedExpenses.map((item) => {
      const category = RECURRING_FROM_EXCEL[item.id]
      return category ? { ...item, recurring: true, category: item.category ?? category } : item
    }),
    ...RECURRING.filter((item) => !existing.has(item.id)),
  ]

  // La versión 2 anotaba el mes entero; ahora se anota gasto a gasto, para que
  // marcar uno nuevo lo añada a un mes ya abierto sin resucitar lo borrado
  const seededItems = data.seededItems ?? Object.fromEntries(
    (data.seededMonths ?? []).map((month) => [month, RECURRING.map((item) => item.id)]),
  )

  return {
    ...data,
    version: CURRENT_VERSION,
    seededItems,
    settings: {
      ...data.settings,
      recurringFrom: data.settings.recurringFrom ?? RECURRING_FROM,
      fixedExpenses,
    },
  }
}
