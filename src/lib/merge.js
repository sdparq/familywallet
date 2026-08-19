/**
 * Fusion de dos versiones del estado (la local y la del servidor).
 * Las listas se mezclan por id quedandose con la version mas reciente de cada elemento;
 * los borrados dejan una lapida (deleted: true) para que no reaparezcan al sincronizar.
 */
const LISTS = ['income', 'fixed', 'savings', 'transactions']

function mergeList(mine = [], theirs = []) {
  const out = new Map()
  for (const item of [...theirs, ...mine]) {
    if (!item || !item.id) continue
    const prev = out.get(item.id)
    if (!prev || (item.updatedAt || 0) >= (prev.updatedAt || 0)) out.set(item.id, item)
  }
  return [...out.values()]
}

function mergeMonthIncome(mine = {}, theirs = {}) {
  const out = {}
  for (const key of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    out[key] = mergeList(mine[key], theirs[key])
  }
  return out
}

export function mergeStates(mine, theirs) {
  if (!theirs) return mine
  if (!mine) return theirs
  const newer = (mine.settings?.updatedAt || 0) >= (theirs.settings?.updatedAt || 0) ? mine : theirs
  const merged = { ...theirs, ...mine, settings: newer.settings }
  for (const list of LISTS) merged[list] = mergeList(mine[list], theirs[list])
  merged.monthIncome = mergeMonthIncome(mine.monthIncome, theirs.monthIncome)
  merged.categories = [...new Set([...(theirs.categories || []), ...(mine.categories || [])])]
  return merged
}
