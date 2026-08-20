import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import seed from '../../src/data/seed.json'
import { applyOp } from '../../src/lib/apply'
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

/** La primera vez que se abre la app no hay nada guardado: se parte del Excel. */
const load = async (): Promise<WalletData> => {
  const saved = await store().get(KEY, { type: 'json' })
  return (saved as WalletData | null) ?? (seed as WalletData)
}

export default async (request: Request) => {
  const password = process.env.APP_PASSWORD
  if (!password) {
    return json({ error: 'Falta la variable de entorno APP_PASSWORD en Netlify' }, 500)
  }
  if (!matches(request.headers.get('x-wallet-key') ?? '', password)) {
    return json({ error: 'Contraseña incorrecta' }, 401)
  }

  if (request.method === 'GET') return json({ data: await load() })

  if (request.method === 'POST') {
    let ops: Op[]
    try {
      ops = (await request.json()).ops
    } catch {
      return json({ error: 'Cuerpo de la petición inválido' }, 400)
    }
    if (!Array.isArray(ops) || ops.length === 0) return json({ error: 'No hay operaciones' }, 400)

    try {
      const data = ops.reduce(applyOp, await load())
      await store().setJSON(KEY, data)
      return json({ data })
    } catch (error) {
      return json({ error: (error as Error).message }, 400)
    }
  }

  return json({ error: 'Método no permitido' }, 405)
}

export const config: Config = { path: '/api/data' }
