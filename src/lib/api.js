const ENDPOINT = '/.netlify/functions/data'
const KEY_STORAGE = 'familywallet.key'

export const getKey = () => localStorage.getItem(KEY_STORAGE) || ''
export const setKey = (k) => localStorage.setItem(KEY_STORAGE, k)
export const clearKey = () => localStorage.removeItem(KEY_STORAGE)

async function request(method, body) {
  const res = await fetch(ENDPOINT, {
    method,
    headers: { 'content-type': 'application/json', 'x-wallet-key': getKey() },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) throw Object.assign(new Error('Clave incorrecta'), { code: 'auth' })
  if (res.status === 404 || res.status === 405) throw Object.assign(new Error('Sin servidor'), { code: 'offline' })
  if (res.status === 409) {
    const data = await res.json()
    throw Object.assign(new Error('Conflicto'), { code: 'conflict', remote: data })
  }
  if (!res.ok) throw Object.assign(new Error(`Error ${res.status}`), { code: 'server' })
  const text = await res.text()
  if (!text.trim().startsWith('{')) throw Object.assign(new Error('Sin servidor'), { code: 'offline' })
  return JSON.parse(text)
}

export const fetchRemote = () => request('GET')
export const pushRemote = (state, rev) => request('PUT', { rev, state })
