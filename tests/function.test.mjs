import { handleRequest } from '../netlify/functions/data.mjs'

const fakeStore = () => {
  let saved = null
  return {
    async get() { return saved },
    async setJSON(_k, v) { saved = v },
    peek: () => saved,
  }
}
const req = (method, key, body) => new Request('http://x/.netlify/functions/data', {
  method, headers: { 'x-wallet-key': key ?? '' }, body: body ? JSON.stringify(body) : undefined,
})
const KEY = 'secreto'
let fails = 0
const check = (name, cond) => { console.log(cond ? '  ok ' : '  FALLO ', name); if (!cond) fails += 1 }

let store = fakeStore()
check('sin WALLET_KEY -> 500', (await handleRequest(req('GET', KEY), store, '')).status === 500)
check('clave mala -> 401', (await handleRequest(req('GET', 'otra'), store, KEY)).status === 401)

let res = await handleRequest(req('GET', KEY), store, KEY)
check('GET vacio -> rev 0, state null', res.status === 200 && JSON.stringify(await res.clone().json()) === '{"rev":0,"state":null}')

res = await handleRequest(req('PUT', KEY, { rev: 0, state: { transactions: [1] } }), store, KEY)
check('PUT inicial -> rev 1', res.status === 200 && (await res.json()).rev === 1)

res = await handleRequest(req('GET', KEY), store, KEY)
const got = await res.json()
check('GET devuelve lo guardado', got.rev === 1 && got.state.transactions[0] === 1)

res = await handleRequest(req('PUT', KEY, { rev: 0, state: { transactions: [2] } }), store, KEY)
check('PUT con rev vieja -> 409 con la version del servidor', res.status === 409 && (await res.json()).rev === 1)
check('el 409 no ha sobrescrito nada', store.peek().state.transactions[0] === 1)

res = await handleRequest(req('PUT', KEY, { rev: 1, state: { transactions: [2] } }), store, KEY)
check('PUT con rev buena -> rev 2', res.status === 200 && (await res.json()).rev === 2)

check('PUT sin estado -> 400', (await handleRequest(req('PUT', KEY, { rev: 2 }), store, KEY)).status === 400)
check('DELETE -> 405', (await handleRequest(req('DELETE', KEY), store, KEY)).status === 405)

console.log(fails ? `\n${fails} fallo(s)` : '\nTodo correcto')
process.exit(fails ? 1 : 0)
