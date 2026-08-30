import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import seed from '../../src/data/seed.json'
import { applyOp } from '../../src/lib/apply'
import { migrate } from '../../src/lib/migrate'
import type { Op, WalletData } from '../../src/lib/types'

const KEY = 'wallet'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Comparación en tiempo constante para no filtrar la contraseña carácter a carácter. */
const matches = (given: string, expected: string) => {
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

const store = () => getStore({ name: 'familywallet', consistency: 'strong' })

/**
 * La primera vez que se abre la app no hay nada guardado: se parte del Excel.
 * Lo guardado se pone al día, y se avisa si hay que volver a escribirlo: si la
 * migración no se persiste, lo que el usuario borre después reaparecería.
 */
const load = async (): Promise<{ data: WalletData; migrated: boolean }> => {
  const saved = (await store().get(KEY, { type: 'json' })) as WalletData | null
  const before = saved ?? (seed as WalletData)
  const data = migrate(before)
  return { data, migrated: data !== before }
}

export default async (request: Request) => {
  const password = process.env.APP_PASSWORD
  if (!password) {
    return json({ error: 'Falta la variable de entorno APP_PASSWORD en Netlify' }, 500)
  }
  if (!matches(request.headers.get('x-wallet-key') ?? '', password)) {
    return json({ error: 'Contraseña incorrecta' }, 401)
  }

  if (request.method === 'GET') {
    const { data, migrated } = await load()
    if (migrated) await store().setJSON(KEY, data)
    return json({ data })
  }

  if (request.method === 'POST') {
    let ops: Op[]
    try {
      ops = (await request.json()).ops
    } catch {
      return json({ error: 'Cuerpo de la petición inválido' }, 400)
    }
    if (!Array.isArray(ops) || ops.length === 0) return json({ error: 'No hay operaciones' }, 400)

    try {
      const data = ops.reduce(applyOp, (await load()).data)
      await store().setJSON(KEY, data)
      return json({ data })
    } catch (error) {
      return json({ error: (error as Error).message }, 400)
    }
  }

  return json({ error: 'Método no permitido' }, 405)
}

export const config: Config = { path: '/api/data' }
