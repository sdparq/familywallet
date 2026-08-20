import type { Frame } from './frames'
import type { Op, WalletData } from './types'

/** Un gasto leído en una captura, todavía sin revisar por el usuario. */
export interface DetectedMovement {
  concepto: string
  importe: number
  moneda: 'AED' | 'EUR'
  categoria: string
  fecha: string | null
}

const STORAGE_KEY = 'familywallet:key'

export const savedKey = () => localStorage.getItem(STORAGE_KEY) ?? ''
export const rememberKey = (key: string) => localStorage.setItem(STORAGE_KEY, key)
export const forgetKey = () => localStorage.removeItem(STORAGE_KEY)

export class AuthError extends Error {}

const request = async (key: string, init?: RequestInit): Promise<WalletData> => {
  const response = await fetch('/api/data', {
    ...init,
    headers: { 'content-type': 'application/json', 'x-wallet-key': key },
  })
  if (response.status === 401) throw new AuthError('Contraseña incorrecta')
  const body = await response.json().catch(() => ({ error: 'Respuesta ilegible del servidor' }))
  if (!response.ok) throw new Error(body.error ?? `Error ${response.status}`)
  return body.data as WalletData
}

export const fetchData = (key: string) => request(key)

export const pushOps = (key: string, ops: Op[]) =>
  request(key, { method: 'POST', body: JSON.stringify({ ops }) })

/** Lee un grupo de capturas y devuelve los gastos que el modelo ha reconocido. */
export const extractMovements = async (
  key: string,
  payload: { images: Frame[]; categories: string[]; month: string },
): Promise<DetectedMovement[]> => {
  const response = await fetch('/api/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-wallet-key': key },
    body: JSON.stringify(payload),
  })
  if (response.status === 401) throw new AuthError('Contraseña incorrecta')
  const body = await response.json().catch(() => ({ error: 'Respuesta ilegible del servidor' }))
  if (!response.ok) throw new Error(body.error ?? `Error ${response.status}`)
  return body.movements as DetectedMovement[]
}
