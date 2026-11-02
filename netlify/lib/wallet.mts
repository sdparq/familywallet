import { getStore } from '@netlify/blobs'
import seed from '../../src/data/seed.json'
import { migrate } from '../../src/lib/migrate'
import type { WalletData } from '../../src/lib/types'

const KEY = 'wallet'

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Comparación en tiempo constante para no filtrar la contraseña carácter a carácter. */
const matches = (given: string, expected: string) => {
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

/** Devuelve una respuesta de error si la petición no está autorizada, o null si lo está. */
export const checkAuth = (request: Request): Response | null => {
  const password = process.env.APP_PASSWORD
  if (!password) return json({ error: 'Falta la variable de entorno APP_PASSWORD en Netlify' }, 500)
  if (!matches(request.headers.get('x-wallet-key') ?? '', password)) {
    return json({ error: 'Contraseña incorrecta' }, 401)
  }
  return null
}

/**
 * En Netlify los datos viven en Blobs. El servidor de desarrollo define
 * FAMILYWALLET_LOCAL_DB para guardarlos en un fichero y poder probar en local
 * estas mismas funciones, sin credenciales de Netlify.
 */
const localFile = () => process.env.FAMILYWALLET_LOCAL_DB

const store = () => {
  const file = localFile()
  if (!file) return getStore({ name: 'familywallet', consistency: 'strong' })
  return {
    get: async (_key: string, _options?: unknown) => {
      const { existsSync, readFileSync } = await import('node:fs')
      return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
    },
    setJSON: async (_key: string, value: unknown) => {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(file, JSON.stringify(value, null, 2))
    },
  }
}

/**
 * La primera vez que se abre la app no hay nada guardado: se parte del Excel.
 * Lo guardado se pone al día, y se avisa si hay que volver a escribirlo: si la
 * migración no se persiste, lo que el usuario borre después reaparecería.
 */
export const loadWallet = async (): Promise<{ data: WalletData; migrated: boolean }> => {
  const saved = (await store().get(KEY, { type: 'json' })) as WalletData | null
  const before = saved ?? (seed as WalletData)
  const data = migrate(before)
  return { data, migrated: data !== before }
}

export const saveWallet = (data: WalletData) => store().setJSON(KEY, data)
