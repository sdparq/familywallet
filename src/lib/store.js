import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { seed } from './seed.js'
import { mergeStates } from './merge.js'
import { fetchRemote, pushRemote, getKey } from './api.js'

const LOCAL = 'familywallet.state'
const POLL_MS = 45000
const SAVE_DEBOUNCE_MS = 900

const now = () => Date.now()
export const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

function stamp(state) {
  return { ...state, updatedAt: now() }
}

function normalize(raw) {
  const base = {
    settings: { rate: 0.24, display: 'AED', year: new Date().getFullYear(), updatedAt: 0 },
    income: [], fixed: [], savings: [], categories: [], monthIncome: {}, transactions: [],
  }
  const s = { ...base, ...(raw || {}) }
  s.settings = { ...base.settings, ...(s.settings || {}) }
  for (const list of ['income', 'fixed', 'savings', 'transactions']) {
    s[list] = (s[list] || []).map((i) => ({ updatedAt: 0, ...i }))
  }
  s.monthIncome = Object.fromEntries(
    Object.entries(s.monthIncome || {}).map(([k, v]) => [k, (v || []).map((i) => ({ updatedAt: 0, ...i }))]),
  )
  return s
}

function readLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL) || 'null')
    if (raw?.state) return { rev: raw.rev || 0, state: normalize(raw.state) }
  } catch { /* estado local corrupto: se ignora y se empieza del seed */ }
  return { rev: 0, state: normalize(seed) }
}

function writeLocal(rev, state) {
  try {
    localStorage.setItem(LOCAL, JSON.stringify({ rev, state }))
  } catch { /* sin espacio: la copia remota sigue siendo la buena */ }
}

export function useWallet() {
  const initial = useRef(readLocal()).current
  const [state, setState] = useState(initial.state)
  const [rev, setRev] = useState(initial.rev)
  const [status, setStatus] = useState('idle') // idle | syncing | saving | offline | auth | error
  const dirty = useRef(false)
  const timer = useRef(null)
  const schedulePushRef = useRef(() => {})
  const latest = useRef({ state: initial.state, rev: initial.rev })

  latest.current = { state, rev }
  useEffect(() => { writeLocal(rev, state) }, [rev, state])

  const pull = useCallback(async () => {
    if (!getKey()) { setStatus('offline'); return }
    setStatus('syncing')
    try {
      const remote = await fetchRemote()
      if (remote.rev !== latest.current.rev || dirty.current) {
        const merged = mergeStates(latest.current.state, remote.state ? normalize(remote.state) : null)
        setState(merged)
        latest.current = { state: merged, rev: remote.rev || 0 }
      }
      setRev(remote.rev || 0)
      setStatus('idle')
      // Servidor vacio (primer arranque): subimos lo que hay aqui para que el otro movil lo vea.
      if (!remote.state) schedulePushRef.current()
    } catch (e) {
      setStatus(e.code === 'auth' ? 'auth' : e.code === 'offline' ? 'offline' : 'error')
    }
  }, [])

  const push = useCallback(async () => {
    if (!getKey()) { setStatus('offline'); return }
    setStatus('saving')
    try {
      const res = await pushRemote(latest.current.state, latest.current.rev)
      setRev(res.rev)
      dirty.current = false
      setStatus('idle')
    } catch (e) {
      if (e.code === 'conflict' && e.remote) {
        const merged = mergeStates(latest.current.state, normalize(e.remote.state))
        setState(merged)
        latest.current = { state: merged, rev: e.remote.rev }
        try {
          const res = await pushRemote(merged, e.remote.rev)
          setRev(res.rev)
          dirty.current = false
          setStatus('idle')
          return
        } catch { /* si el segundo intento falla se reintenta en el siguiente cambio */ }
      }
      setStatus(e.code === 'auth' ? 'auth' : e.code === 'offline' ? 'offline' : 'error')
    }
  }, [])

  const schedulePush = useCallback(() => {
    dirty.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(push, SAVE_DEBOUNCE_MS)
  }, [push])
  schedulePushRef.current = schedulePush

  useEffect(() => {
    pull()
    const id = setInterval(() => { if (!dirty.current) pull() }, POLL_MS)
    return () => { clearInterval(id); clearTimeout(timer.current) }
  }, [pull])

  const update = useCallback((fn) => {
    setState((prev) => {
      const next = fn(prev)
      latest.current = { ...latest.current, state: next }
      return next
    })
    schedulePush()
  }, [schedulePush])

  const actions = useMemo(() => {
    const upsertIn = (list) => (item) => update((s) => {
      const exists = s[list].some((i) => i.id === item.id)
      const value = { ...item, updatedAt: now() }
      return { ...s, [list]: exists ? s[list].map((i) => (i.id === item.id ? { ...i, ...value } : i)) : [...s[list], value] }
    })
    const removeIn = (list) => (id) => update((s) => ({
      ...s,
      [list]: s[list].map((i) => (i.id === id ? { ...i, deleted: true, updatedAt: now() } : i)),
    }))

    return {
      addTransaction: (tx) => update((s) => ({
        ...s,
        transactions: [...s.transactions, { id: newId(), ...tx, updatedAt: now() }],
      })),
      saveTransaction: upsertIn('transactions'),
      removeTransaction: removeIn('transactions'),

      saveIncome: upsertIn('income'),
      removeIncome: removeIn('income'),
      addIncome: () => update((s) => ({
        ...s,
        income: [...s.income, { id: newId(), name: 'Nuevo ingreso', amount: 0, currency: 'AED', updatedAt: now() }],
      })),

      saveFixed: upsertIn('fixed'),
      removeFixed: removeIn('fixed'),
      addFixed: () => update((s) => ({
        ...s,
        fixed: [...s.fixed, { id: newId(), name: 'Nuevo gasto fijo', amount: 0, currency: 'AED', updatedAt: now() }],
      })),

      saveSaving: upsertIn('savings'),
      removeSaving: removeIn('savings'),
      addSaving: (group) => update((s) => ({
        ...s,
        savings: [...s.savings, {
          id: newId(), group, name: 'Nueva cuenta', goal: 0, contribution: 0, initial: 0,
          currency: 'AED', updatedAt: now(),
        }],
      })),

      setMonthIncome: (key, id, patch) => update((s) => {
        const list = s.monthIncome[key] || []
        const exists = list.some((i) => i.id === id)
        const next = exists
          ? list.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i))
          : [...list, { id, ...patch, updatedAt: now() }]
        return { ...s, monthIncome: { ...s.monthIncome, [key]: next } }
      }),
      clearMonthIncome: (key, id) => update((s) => ({
        ...s,
        monthIncome: {
          ...s.monthIncome,
          [key]: (s.monthIncome[key] || []).map((i) => (i.id === id ? { ...i, deleted: true, updatedAt: now() } : i)),
        },
      })),

      setSettings: (patch) => update((s) => ({ ...s, settings: stamp({ ...s.settings, ...patch }) })),
      setCategories: (categories) => update((s) => ({ ...s, categories })),
      replaceState: (raw) => update(() => normalize(raw)),
    }
  }, [update])

  return { state, actions, status, sync: { pull, push }, rev }
}
