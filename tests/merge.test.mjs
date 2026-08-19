import { mergeStates } from '../src/lib/merge.js'

let fails = 0
const check = (name, cond) => { console.log(cond ? '  ok ' : '  FALLO ', name); if (!cond) fails += 1 }
const base = { settings: { updatedAt: 0 }, income: [], fixed: [], savings: [], categories: [], monthIncome: {}, transactions: [] }
const tx = (id, concept, updatedAt, extra = {}) => ({ id, concept, amount: 1, updatedAt, ...extra })

let m = mergeStates(
  { ...base, transactions: [tx('a', 'mio', 10)] },
  { ...base, transactions: [tx('b', 'suyo', 5)] },
)
check('se quedan los movimientos de los dos', m.transactions.length === 2)

m = mergeStates(
  { ...base, transactions: [tx('a', 'viejo', 5)] },
  { ...base, transactions: [tx('a', 'nuevo', 50)] },
)
check('gana la edicion mas reciente', m.transactions[0].concept === 'nuevo')

m = mergeStates(
  { ...base, transactions: [tx('a', 'x', 5)] },
  { ...base, transactions: [tx('a', 'x', 50, { deleted: true })] },
)
check('lo borrado no reaparece', m.transactions[0].deleted === true)

m = mergeStates(
  { ...base, settings: { rate: 0.25, updatedAt: 100 } },
  { ...base, settings: { rate: 0.24, updatedAt: 10 } },
)
check('los ajustes mas recientes ganan', m.settings.rate === 0.25)

m = mergeStates(
  { ...base, categories: ['Ocio'] },
  { ...base, categories: ['Viajes', 'Ocio'] },
)
check('las categorias se unen sin repetir', m.categories.join() === 'Viajes,Ocio')

m = mergeStates(
  { ...base, monthIncome: { '2026-06': [{ id: 'i1', amount: 100, updatedAt: 20 }] } },
  { ...base, monthIncome: { '2026-06': [{ id: 'i1', amount: 999, updatedAt: 1 }], '2026-07': [{ id: 'i1', amount: 5, updatedAt: 1 }] } },
)
check('los ingresos por mes se fusionan', m.monthIncome['2026-06'][0].amount === 100 && m.monthIncome['2026-07'].length === 1)

check('sin version remota se queda la local', mergeStates(base, null) === base)

console.log(fails ? `\n${fails} fallo(s)` : '\nFusion correcta')
process.exit(fails ? 1 : 0)
