import type { Config } from '@netlify/functions'
import { checkAuth, json, loadWallet, saveWallet } from '../lib/wallet.mts'
import { applyOp } from '../../src/lib/apply'
import { guessCategory } from '../../src/lib/parse'
import { parseSms, smsId, todayInDubai } from '../../src/lib/sms'
import type { Transaction } from '../../src/lib/types'

/**
 * Recibe el SMS del banco que le reenvía el atajo del móvil y lo apunta como
 * gasto. Lo que no reconoce no lo inventa: responde diciendo por qué lo ignora.
 */
export default async (request: Request) => {
  const denied = checkAuth(request)
  if (denied) return denied
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const raw = await request.text()
  let text = raw
  try {
    const body = JSON.parse(raw)
    if (typeof body?.text === 'string') text = body.text
  } catch {
    // El atajo puede mandar el SMS como texto plano; se usa tal cual
  }

  const result = parseSms(text, todayInDubai())
  if (result.kind === 'ignorado') {
    return json({ added: false, reason: result.reason, message: `Ignorado: ${result.reason}` })
  }

  const { expense } = result
  const { data } = await loadWallet()
  const id = smsId(text)

  if (data.transactions.some((tx) => tx.id === id)) {
    return json({ added: false, reason: 'duplicado', message: 'Ese SMS ya estaba apuntado' })
  }

  const history = data.transactions.map((tx) => ({ concept: tx.concept, category: tx.category }))
  const tx: Transaction = {
    id,
    month: expense.date.slice(0, 7),
    week: Math.min(5, Math.ceil(Number(expense.date.slice(8, 10)) / 7)),
    date: expense.date,
    concept: expense.concept,
    category: guessCategory(expense.concept, history) ?? 'Otros',
    amount: expense.amount,
    currency: expense.currency,
  }

  await saveWallet(applyOp(data, { type: 'tx.add', tx }))
  return json({
    added: true,
    transaction: tx,
    message: `${tx.concept}: ${tx.amount} ${tx.currency} · ${tx.category}`,
  })
}

export const config: Config = { path: '/api/sms' }
