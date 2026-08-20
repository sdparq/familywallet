import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthError, fetchData, forgetKey, pushOps, rememberKey, savedKey } from './api'
import { applyOp } from './apply'
import type { Op, WalletData } from './types'

interface Store {
  data: WalletData | null
  /** Necesaria para las llamadas que no pasan por dispatch, como la importación. */
  key: string
  status: 'locked' | 'loading' | 'ready' | 'error'
  error: string | null
  saving: boolean
  signIn: (key: string) => Promise<void>
  signOut: () => void
  dispatch: (...ops: Op[]) => void
  reload: () => void
}

const WalletContext = createContext<Store | null>(null)

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [key, setKey] = useState(savedKey)
  const [data, setData] = useState<WalletData | null>(null)
  const [status, setStatus] = useState<Store['status']>(key ? 'loading' : 'locked')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  /** Las escrituras se encadenan: dos gastos seguidos no pueden pisarse entre sí. */
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  const load = useCallback(async (currentKey: string) => {
    setStatus('loading')
    try {
      setData(await fetchData(currentKey))
      setError(null)
      setStatus('ready')
    } catch (caught) {
      if (caught instanceof AuthError) {
        forgetKey()
        setKey('')
        setStatus('locked')
      } else {
        setStatus('error')
      }
      setError((caught as Error).message)
    }
  }, [])

  useEffect(() => {
    if (key) void load(key)
  }, [key, load])

  const signIn = useCallback(async (candidate: string) => {
    const loaded = await fetchData(candidate)
    rememberKey(candidate)
    setKey(candidate)
    setData(loaded)
    setError(null)
    setStatus('ready')
  }, [])

  const signOut = useCallback(() => {
    forgetKey()
    setKey('')
    setData(null)
    setStatus('locked')
  }, [])

  const dispatch = useCallback((...ops: Op[]) => {
    if (ops.length === 0) return
    // Se pinta al momento y se confirma con el servidor: la app no espera a la red
    setData((current) => (current ? ops.reduce(applyOp, current) : current))
    setSaving(true)
    queue.current = queue.current
      .then(() => pushOps(key, ops))
      .then((saved) => {
        setData(saved)
        setError(null)
      })
      .catch((caught: Error) => {
        setError(`No se pudo guardar: ${caught.message}`)
        return fetchData(key).then(setData).catch(() => undefined)
      })
      .finally(() => setSaving(false))
  }, [key])

  const value = useMemo<Store>(
    () => ({ data, key, status, error, saving, signIn, signOut, dispatch, reload: () => void load(key) }),
    [data, key, status, error, saving, signIn, signOut, dispatch, load],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export const useWallet = () => {
  const store = useContext(WalletContext)
  if (!store) throw new Error('useWallet fuera de WalletProvider')
  return store
}

/** Igual que useWallet pero garantizando datos: para vistas que solo se montan con sesión. */
export const useData = () => {
  const store = useWallet()
  if (!store.data) throw new Error('useData sin datos cargados')
  return { ...store, data: store.data }
}
