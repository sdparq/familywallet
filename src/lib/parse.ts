import type { Currency } from './types'

/** Un movimiento leído del texto pegado, antes de que el usuario lo revise. */
export interface ParsedMovement {
  concept: string
  amount: number
  currency: Currency
  date: string | null
  /** Los ingresos se detectan para poder descartarlos: aquí solo se apuntan gastos. */
  kind: 'gasto' | 'ingreso'
}

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12, dec: 12,
}

const HEADERS = {
  date: ['fecha', 'date', 'fecha operacion', 'fecha valor', 'transaction date', 'value date', 'posting date'],
  concept: ['concepto', 'descripcion', 'description', 'detalle', 'details', 'narrative', 'merchant',
    'remarks', 'particulars', 'transaction', 'referencia'],
  amount: ['importe', 'amount', 'monto', 'valor'],
  debit: ['debito', 'debit', 'cargo', 'salida', 'withdrawal', 'pago', 'gasto'],
  credit: ['credito', 'credit', 'abono', 'entrada', 'deposit', 'ingreso'],
  currency: ['moneda', 'currency', 'ccy', 'divisa'],
}

/** Palabras que delatan una fila que no es un movimiento. */
const NOISE = ['saldo', 'balance', 'total', 'subtotal', 'disponible', 'opening', 'closing',
  'movimientos', 'transacciones', 'transactions', 'historial', 'extracto', 'statement']

/** Un abono suele venir marcado por el signo, pero también por el texto. */
const INCOME_WORDS = ['abono', 'ingreso', 'salary', 'salario', 'nomina', 'nómina', 'credit', 'refund',
  'devolucion', 'devolución', 'reembolso', 'transfer in', 'deposit']

const clean = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Reparte una línea en celdas: tabulador, punto y coma o coma con comillas. */
const splitCells = (line: string): string[] => {
  if (line.includes('\t')) return line.split('\t').map((cell) => cell.trim())
  if (line.includes(';')) return line.split(';').map((cell) => cell.trim())
  const csv = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)
  if (csv && csv.length > 2) {
    return csv.map((cell) => cell.replace(/,$/, '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
  }
  return [line.trim()]
}

/**
 * Convierte el número tal y como lo escribe el banco. Cuando aparecen los dos
 * separadores, el último es el decimal: sirve para 1.234,56 y para 1,234.56.
 */
const toNumber = (raw: string): number | null => {
  const digits = raw.replace(/\s/g, '')
  const lastDot = digits.lastIndexOf('.')
  const lastComma = digits.lastIndexOf(',')
  let normalized: string
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = Math.max(lastDot, lastComma)
    normalized = digits.slice(0, decimal).replace(/[.,]/g, '') + '.' + digits.slice(decimal + 1)
  } else if (lastDot >= 0 || lastComma >= 0) {
    const at = Math.max(lastDot, lastComma)
    const decimals = digits.length - at - 1
    // Tres cifras detrás es un separador de miles (1.234); una o dos, decimales
    normalized = decimals === 3
      ? digits.replace(/[.,]/g, '')
      : digits.slice(0, at).replace(/[.,]/g, '') + '.' + digits.slice(at + 1)
  } else {
    normalized = digits
  }
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

const AMOUNT = /(-|\+)?\s*(AED|DHS|EUR|€|USD|\$)?\s*(\d[\d.,]*\d|\d)\s*(AED|DHS|EUR|€|USD|\$)?/gi
const MONTH_NAMES = Object.keys(MONTHS).join('|')
const DATES = new RegExp(
  String.raw`\b\d{4}-\d{2}-\d{2}\b` +
  String.raw`|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b` +
  // Con puntos hay que exigir el año: 42.75 es un importe, no un 42 de julio
  String.raw`|\b\d{1,2}\.\d{1,2}\.\d{2,4}\b` +
  String.raw`|\b\d{1,2}\s*[-. ]?\s*(?:${MONTH_NAMES})[a-z]*\.?\s*[-. ]?\s*\d{0,4}\b`,
  'gi',
)

/** Las fechas se quitan antes de buscar importes: si no, 12/08/2026 parece dinero. */
const withoutDates = (text: string) => text.replace(DATES, ' ')

interface Amount {
  value: number
  currency: Currency
  negative: boolean
}

const currencyOf = (symbol: string | undefined): Currency | null => {
  if (!symbol) return null
  const upper = symbol.toUpperCase()
  return upper === 'EUR' || upper === '€' ? 'EUR' : upper === 'AED' || upper === 'DHS' ? 'AED' : null
}

/** Todos los importes de un texto, en el orden en que aparecen. */
const amountsIn = (text: string): Amount[] => {
  const found: Amount[] = []
  for (const match of text.matchAll(AMOUNT)) {
    const [whole, sign, before, digits, after] = match
    const value = toNumber(digits)
    if (value === null) continue
    const parenthesised = text[match.index - 1] === '(' && text[match.index + whole.length] === ')'
    found.push({
      value: Math.abs(value),
      currency: currencyOf(before) ?? currencyOf(after) ?? 'AED',
      negative: sign === '-' || parenthesised || /\bdr\b/i.test(text.slice(match.index + whole.length, match.index + whole.length + 4)),
    })
  }
  return found
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Fecha en AAAA-MM-DD, o null. Acepta 12/08/2026, 2026-08-12 y "12 ago 2026". */
const dateIn = (text: string, year: number): string | null => {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/) ??
    text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = Number(numeric[2])
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const raw = numeric[3] ? Number(numeric[3]) : year
      const full = raw < 100 ? 2000 + raw : raw
      return `${full}-${pad(month)}-${pad(day)}`
    }
  }

  const named = clean(text).match(new RegExp(String.raw`\b(\d{1,2})\s*[-. ]?\s*(${MONTH_NAMES})[a-z]*\.?\s*[-. ]?\s*(\d{4})?`))
  if (named) {
    const month = MONTHS[named[2].slice(0, 4)] ?? MONTHS[named[2].slice(0, 3)]
    const day = Number(named[1])
    if (month && day >= 1 && day <= 31) return `${named[3] ?? year}-${pad(month)}-${pad(day)}`
  }
  return null
}

/** Deja solo el texto del concepto: sin fechas, sin importes y sin separadores sueltos. */
const stripNoise = (text: string) =>
  withoutDates(text)
    .replace(AMOUNT, ' ')
    .replace(/\b(AED|DHS|EUR|USD)\b|€|\$/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;|·-]+|[\s,;|·-]+$/g, '')
    .trim()

const headerIndex = (cells: string[], names: string[]) =>
  cells.findIndex((cell) => names.some((name) => clean(cell) === name || clean(cell).includes(name)))

/** Detecta la fila de cabecera de un CSV descargado del banco. */
const readHeader = (cells: string[]) => {
  if (cells.length < 2) return null
  const map = {
    date: headerIndex(cells, HEADERS.date),
    concept: headerIndex(cells, HEADERS.concept),
    amount: headerIndex(cells, HEADERS.amount),
    debit: headerIndex(cells, HEADERS.debit),
    credit: headerIndex(cells, HEADERS.credit),
    currency: headerIndex(cells, HEADERS.currency),
  }
  const usable = map.concept >= 0 && (map.amount >= 0 || map.debit >= 0 || map.credit >= 0)
  return usable ? map : null
}

const isIncomeText = (text: string) => INCOME_WORDS.some((word) => clean(text).includes(word))

/**
 * Lee movimientos de un texto pegado: un CSV del banco, una tabla copiada o la
 * lista de la app del móvil. Todo se resuelve en el navegador, sin enviar nada.
 */
export const parseStatement = (text: string, year: number): ParsedMovement[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return []

  const header = readHeader(splitCells(lines[0]))
  const movements: ParsedMovement[] = []

  if (header) {
    for (const line of lines.slice(1)) {
      const cells = splitCells(line)
      const concept = stripNoise(cells[header.concept] ?? '')
      if (!concept) continue

      const debit = header.debit >= 0 ? amountsIn(cells[header.debit] ?? '')[0] : undefined
      const credit = header.credit >= 0 ? amountsIn(cells[header.credit] ?? '')[0] : undefined
      const plain = header.amount >= 0 ? amountsIn(cells[header.amount] ?? '')[0] : undefined
      const picked = debit ?? plain ?? credit
      if (!picked || picked.value === 0) continue

      const currency = (header.currency >= 0
        ? currencyOf(cells[header.currency]) : null) ?? picked.currency
      const isIncome = Boolean(credit && !debit && !plain) ||
        (plain ? !plain.negative && isIncomeText(line) : false)

      movements.push({
        concept,
        amount: picked.value,
        currency,
        date: header.date >= 0 ? dateIn(cells[header.date] ?? '', year) : dateIn(line, year),
        kind: isIncome ? 'ingreso' : 'gasto',
      })
    }
    return movements
  }

  // Sin cabecera: texto suelto. Las líneas sin importe describen el movimiento
  // que viene después, que es como se copia la lista desde la app del banco.
  let pending: string[] = []
  let pendingDate: string | null = null
  for (const line of lines) {
    if (NOISE.some((word) => clean(line).startsWith(word))) {
      pending = []
      pendingDate = null
      continue
    }
    const date = dateIn(line, year)
    const amounts = amountsIn(withoutDates(line))
    if (amounts.length === 0) {
      // Una línea sin importe describe el movimiento que viene después, que es
      // como se copia la lista desde la app del banco
      if (date) pendingDate = date
      const label = stripNoise(line)
      // Solo las dos últimas líneas describen el movimiento; lo anterior es adorno
      if (label) pending = [...pending, label].slice(-2)
      continue
    }

    // Con fecha delante, la primera cifra es el importe y la última suele ser el
    // saldo; sin fecha, el importe es lo último de la línea
    const startsWithDate = date !== null && dateIn(line.slice(0, 12), year) !== null
    const picked = startsWithDate ? amounts[0] : amounts[amounts.length - 1]
    const concept = [...pending, stripNoise(line)].filter(Boolean).join(' ').trim()
    const movementDate = date ?? pendingDate
    pending = []
    pendingDate = null
    if (picked.value === 0 || !concept) continue

    movements.push({
      concept,
      amount: picked.value,
      currency: picked.currency,
      date: movementDate,
      kind: !picked.negative && (isIncomeText(concept) || /^\+/.test(line.trim())) ? 'ingreso' : 'gasto',
    })
  }
  return movements
}

/**
 * Adivina la categoría a partir de lo ya apuntado: si un gasto anterior comparte
 * una palabra con el concepto nuevo, hereda su categoría.
 */
export const guessCategory = (
  concept: string,
  history: Array<{ concept: string; category: string }>,
): string | null => {
  const words = clean(concept).split(/\s+/).filter((word) => word.length >= 3)
  if (words.length === 0) return null

  const scores = new Map<string, number>()
  for (const past of history) {
    const pastWords = new Set(clean(past.concept).split(/\s+/).filter((word) => word.length >= 3))
    const shared = words.filter((word) => pastWords.has(word)).length
    if (shared > 0) scores.set(past.category, (scores.get(past.category) ?? 0) + shared)
  }
  const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : null
}
