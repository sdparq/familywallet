import type { Config } from '@netlify/functions'
import { checkAuth, json, loadWallet, saveWallet } from '../lib/wallet.mts'
import { applyOp } from '../../src/lib/apply'
import type { Op } from '../../src/lib/types'

export default async (request: Request) => {
  const denied = checkAuth(request)
  if (denied) return denied

  if (request.method === 'GET') {
    const { data, migrated } = await loadWallet()
    if (migrated) await saveWallet(data)
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
      const data = ops.reduce(applyOp, (await loadWallet()).data)
      await saveWallet(data)
      return json({ data })
    } catch (error) {
      return json({ error: (error as Error).message }, 400)
    }
  }

  return json({ error: 'Método no permitido' }, 405)
}

export const config: Config = { path: '/api/data' }
