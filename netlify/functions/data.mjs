import { getStore } from '@netlify/blobs'

const STORE = 'familywallet'
const RECORD = 'state'

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

/** Logica separada del runtime de Netlify para poder probarla con un store falso. */
export async function handleRequest(req, store, expectedKey) {
  if (!expectedKey) {
    return json(500, { error: 'Falta la variable de entorno WALLET_KEY en Netlify.' })
  }
  if (req.headers.get('x-wallet-key') !== expectedKey) {
    return json(401, { error: 'Clave incorrecta.' })
  }

  if (req.method === 'GET') {
    const saved = await store.get(RECORD, { type: 'json' })
    return json(200, saved || { rev: 0, state: null })
  }

  if (req.method === 'PUT') {
    let body
    try {
      body = await req.json()
    } catch {
      return json(400, { error: 'Cuerpo no valido.' })
    }
    if (!body?.state) return json(400, { error: 'Falta el estado.' })

    const saved = (await store.get(RECORD, { type: 'json' })) || { rev: 0, state: null }
    // Si el otro dispositivo guardo antes, se devuelve su version para que el cliente la fusione.
    if (saved.rev !== (body.rev ?? 0)) return json(409, saved)

    const next = { rev: saved.rev + 1, state: body.state, savedAt: new Date().toISOString() }
    await store.setJSON(RECORD, next)
    return json(200, { rev: next.rev, savedAt: next.savedAt })
  }

  return json(405, { error: 'Metodo no soportado.' })
}

export default async (req) =>
  handleRequest(req, getStore(STORE), process.env.WALLET_KEY)

export const config = { path: '/.netlify/functions/data' }
