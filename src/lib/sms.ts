import type { Currency } from './types'

export interface SmsExpense {
  amount: number
  currency: Currency
  concept: string
  date: string
}

export type SmsResult =
  | { kind: 'gasto'; expense: SmsExpense }
  | { kind: 'ignorado'; reason: string }

/** Mensajes que nunca son un gasto, aunque lleven cifras. */
const NEVER = [
  'otp', 'one time password', 'one-time password', 'do not share', 'no comparta',
  'verification code', 'codigo de verificacion', 'password', 'login', 'beneficiary added',
  'statement is ready', 'due date', 'minimum payment', 'promotion', 'offer', 'win ',
]

/** Un abono no es un gasto. */
const CREDITS = [
  'credited', 'credit of', 'has been credited', 'salary', 'received', 'refund', 'reversal',
  'reversed', 'deposit', 'cashback', 'transfer from', 'incoming', 'abono', 'ingreso',
]

/** Señales de que sí ha salido dinero. */
const DEBITS = [
  'spent', 'purchase', 'was used', 'has been used', 'debited', 'debit of', 'payment of',
  'paid', 'withdrawn', 'withdrawal', 'charged', 'transaction of', 'deducted', 'compra',
  'pos ', 'atm ',
]

/** Lo que precede a un importe que es un saldo, no el gasto. */
const BALANCE_NEAR = ['balance', 'bal ', 'bal.', 'avl', 'available', 'limit', 'remaining']

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
}

const clean = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const AMOUNT = /\b(AED|DHS|EUR|USD|GBP|SAR)\s*([\d.,]+)|\b([\d.,]+)\s*(AED|DHS|EUR|USD|GBP|SAR)\b/gi

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
    normalized = digits.length - at - 1 === 3
      ? digits.replace(/[.,]/g, '')
      : digits.slice(0, at).replace(/[.,]/g, '') + '.' + digits.slice(at + 1)
  } else {
    normalized = digits
  }
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
}

interface Found {
  value: number
  code: string
  index: number
}

/** Importes del mensaje, descartando los que son un saldo o un límite. */
const amountsIn = (text: string): Found[] => {
  const found: Found[] = []
  for (const match of text.matchAll(AMOUNT)) {
    const code = (match[1] ?? match[4]).toUpperCase()
    const value = toNumber(match[2] ?? match[3])
    if (value === null) continue
    // "Available balance AED 5,420.30" lleva un importe que no se ha gastado
    const before = clean(text.slice(Math.max(0, match.index - 28), match.index))
    if (BALANCE_NEAR.some((word) => before.includes(word))) continue
    found.push({ value, code, index: match.index })
  }
  return found
}

const pad = (value: number) => String(value).padStart(2, '0')

const dateIn = (text: string): string | null => {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const numeric = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/)
  if (numeric) {
    const [day, month] = [Number(numeric[1]), Number(numeric[2])]
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const year = Number(numeric[3])
      return `${year < 100 ? 2000 + year : year}-${pad(month)}-${pad(day)}`
    }
  }

  const named = clean(text).match(/\b(\d{1,2})[-\s]([a-z]{3})[a-z]*[-\s](\d{2,4})\b/)
  if (named && MONTHS[named[2]]) {
    const year = Number(named[3])
    return `${year < 100 ? 2000 + year : year}-${pad(MONTHS[named[2]])}-${pad(Number(named[1]))}`
  }
  return null
}

/** El comercio suele ir detrás de "at"; se corta en la fecha o en el saldo. */
const merchantIn = (text: string): string | null => {
  const match = text.match(/\b(?:at|en)[:\s]+(.{2,60}?)(?=\s+(?:on|el|dated|avl|available|bal|balance|ref|txn|trn)\b|[.;]|$)/i)
  if (!match) return null
  const name = match[1].replace(/\s{2,}/g, ' ').replace(/[,;.\-\s]+$/, '').trim()
  return name.length >= 2 ? name : null
}

/** Hoy en Dubái: una compra de madrugada no debe contarse en el día anterior. */
export const todayInDubai = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)

/**
 * Lee el SMS que manda el banco al pagar con tarjeta. Es deliberadamente
 * prudente: ante la duda devuelve 'ignorado' con el motivo, porque apuntar un
 * gasto que no existe es peor que no apuntar nada.
 */
export const parseSms = (text: string, today = todayInDubai()): SmsResult => {
  const body = text.trim()
  if (body.length < 10) return { kind: 'ignorado', reason: 'El mensaje está vacío o es muy corto' }

  const lower = clean(body)
  const hit = NEVER.find((word) => lower.includes(word))
  if (hit) return { kind: 'ignorado', reason: `No es un gasto (contiene "${hit.trim()}")` }

  const credit = CREDITS.find((word) => lower.includes(word))
  if (credit) return { kind: 'ignorado', reason: `Parece un ingreso (contiene "${credit.trim()}")` }

  if (!DEBITS.some((word) => lower.includes(word))) {
    return { kind: 'ignorado', reason: 'No se reconoce como un pago' }
  }

  const amounts = amountsIn(body)
  if (amounts.length === 0) return { kind: 'ignorado', reason: 'No se encuentra el importe' }

  // Si el banco da el importe en divisa y en dírhams, manda el de dírhams
  const picked = amounts.find((item) => item.code === 'AED' || item.code === 'DHS')
    ?? amounts.find((item) => item.code === 'EUR')
    ?? amounts[0]
  if (picked.code !== 'AED' && picked.code !== 'DHS' && picked.code !== 'EUR') {
    return { kind: 'ignorado', reason: `Importe en ${picked.code}: apúntalo a mano` }
  }

  const date = dateIn(body) ?? today
  return {
    kind: 'gasto',
    expense: {
      amount: picked.value,
      currency: picked.code === 'EUR' ? 'EUR' : 'AED',
      concept: merchantIn(body) ?? 'Gasto con tarjeta',
      date,
    },
  }
}

/** Identificador estable del mensaje: si el atajo lo reenvía, no se duplica. */
export const smsId = (text: string) => {
  let hash = 0x811c9dc5
  const normalized = clean(text).replace(/\s+/g, ' ').trim()
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `sms-${hash.toString(16)}`
}
