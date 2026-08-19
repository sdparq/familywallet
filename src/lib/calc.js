export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`
export const monthLabel = (key) => {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`
}

/** Todo se guarda en su moneda original; aqui se convierte a la moneda que se muestra. */
export function convert(amount, from, to, rate) {
  const value = Number(amount) || 0
  if (from === to) return value
  if (from === 'AED' && to === 'EUR') return value * rate
  if (from === 'EUR' && to === 'AED') return value / rate
  return value
}

export const toDisplay = (item, display, rate) =>
  convert(item.amount, item.currency || 'AED', display, rate)

export function formatMoney(value, currency, opts = {}) {
  const v = Number.isFinite(value) ? value : 0
  const decimals = opts.decimals ?? (Math.abs(v) >= 1000 ? 0 : 2)
  const text = v.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return currency === 'EUR' ? `${text} €` : `${text} AED`
}

/** Ingresos del mes: los base del presupuesto, con las sobreescrituras del mes concreto. */
export function incomeForMonth(state, key) {
  const overrides = state.monthIncome?.[key] || []
  return state.income
    .filter((i) => !i.deleted)
    .map((i) => {
      const o = overrides.find((x) => x.id === i.id && !x.deleted)
      return o ? { ...i, amount: o.amount, currency: o.currency, overridden: true } : i
    })
}

export const sumIn = (items, display, rate) =>
  items.reduce((acc, i) => acc + toDisplay(i, display, rate), 0)

export const activeTx = (state, key) =>
  state.transactions.filter((t) => !t.deleted && t.month === key)

/** Presupuesto disponible para gastar = ingresos - gastos fijos - ahorro, igual que en el Excel. */
export function budgetForMonth(state, key, display) {
  const rate = state.settings.rate
  const income = sumIn(incomeForMonth(state, key), display, rate)
  const fixed = sumIn(state.fixed.filter((f) => !f.deleted), display, rate)
  const savings = state.savings
    .filter((s) => !s.deleted)
    .reduce((acc, s) => acc + convert(s.contribution, s.currency || 'AED', display, rate), 0)
  const spent = activeTx(state, key).reduce((acc, t) => acc + toDisplay(t, display, rate), 0)
  const available = income - fixed - savings
  return { income, fixed, savings, available, spent, remaining: available - spent, balance: income - spent }
}

export function byCategory(state, key, display) {
  const rate = state.settings.rate
  const map = new Map()
  for (const t of activeTx(state, key)) {
    const cat = t.category || 'Otros'
    const prev = map.get(cat) || { category: cat, count: 0, total: 0 }
    prev.count += 1
    prev.total += toDisplay(t, display, rate)
    map.set(cat, prev)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function byWeek(state, key, display) {
  const rate = state.settings.rate
  const weeks = [1, 2, 3, 4, 5].map((w) => ({ week: w, items: [], total: 0 }))
  for (const t of activeTx(state, key)) {
    const w = weeks[Math.min(Math.max(Number(t.week) || 1, 1), 5) - 1]
    w.items.push(t)
    w.total += toDisplay(t, display, rate)
  }
  for (const w of weeks) {
    w.items.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
  }
  return weeks
}

/** Semana del mes (1-5) a partir de una fecha ISO, contando bloques de 7 dias desde el dia 1. */
export function weekOfMonth(iso) {
  if (!iso) return 1
  const day = Number(iso.slice(8, 10))
  if (!day) return 1
  return Math.min(5, Math.floor((day - 1) / 7) + 1)
}

export function yearSummary(state, year, display) {
  return Array.from({ length: 12 }, (_, i) => {
    const key = monthKey(year, i + 1)
    const b = budgetForMonth(state, key, display)
    return { key, name: MONTH_NAMES[i], ...b }
  })
}

export function savingsTotals(state, display) {
  const rate = state.settings.rate
  const rows = state.savings.filter((s) => !s.deleted)
  const acc = (fn) => rows.reduce((a, s) => a + convert(fn(s), s.currency || 'AED', display, rate), 0)
  return {
    goal: acc((s) => s.goal),
    contribution: acc((s) => s.contribution),
    initial: acc((s) => s.initial),
    final: acc((s) => (Number(s.initial) || 0) + (Number(s.contribution) || 0)),
  }
}
