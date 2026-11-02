import { useState } from 'react'
import { guessCategory } from '../lib/parse'
import { parseSms } from '../lib/sms'
import { useData } from '../lib/store'
import { Card } from './ui'

const PASOS = [
  'En el iPhone, abre Atajos → pestaña Automatización → + → Mensaje.',
  'En "Remitente" pon el número o el nombre con el que te escribe el banco, y elige "Ejecutar inmediatamente".',
  'Añade la acción "Obtener contenido de la URL" con la dirección de abajo, método POST.',
  'En Cabeceras añade x-wallet-key con vuestra contraseña, y Content-Type con application/json.',
  'En Cuerpo de la petición elige JSON, añade un campo de texto llamado text y ponle dentro la variable Contenido del mensaje.',
  'Opcional: añade al final "Mostrar notificación" con el resultado, para ver qué ha apuntado.',
]

export default function SmsSetup() {
  const { data } = useData()
  const [sms, setSms] = useState('')
  const [open, setOpen] = useState(false)

  const url = `${window.location.origin}/api/sms`
  const result = sms.trim() ? parseSms(sms) : null
  const category = result?.kind === 'gasto'
    ? guessCategory(result.expense.concept,
        data.transactions.map((tx) => ({ concept: tx.concept, category: tx.category }))) ?? 'Otros'
    : null

  return (
    <Card
      title="Apuntar gastos por SMS"
      action={
        <button
          type="button"
          className="text-xs text-neutral-600 underline hover:text-neutral-900"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Ocultar' : 'Cómo se configura'}
        </button>
      }
    >
      <p className="text-sm text-neutral-600">
        El iPhone puede reenviar aquí el SMS que manda el banco con cada compra, y el
        gasto se apunta solo. Se configura una vez en la app Atajos.
      </p>

      {open && (
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-neutral-600">
          {PASOS.map((paso) => <li key={paso}>{paso}</li>)}
        </ol>
      )}

      <div className="mt-3">
        <span className="label">Dirección a la que envía el atajo</span>
        <code className="block break-all rounded-md border border-line bg-neutral-50 px-3 py-2 text-xs">
          {url}
        </code>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <label className="label" htmlFor="sms">Probar un SMS de tu banco</label>
        <textarea
          id="sms"
          rows={3}
          className="field text-xs"
          placeholder="Pega aquí un SMS real del banco para ver qué haría"
          value={sms}
          onChange={(event) => setSms(event.target.value)}
        />
        {result && (
          <p className={`mt-2 text-sm ${result.kind === 'gasto' ? 'text-emerald-700' : 'text-neutral-500'}`}>
            {result.kind === 'gasto'
              ? `Apuntaría: ${result.expense.concept} · ${result.expense.amount} ${result.expense.currency} · ${category} · ${result.expense.date}`
              : `No lo apuntaría. ${result.reason}`}
          </p>
        )}
        <p className="mt-2 text-xs text-neutral-500">
          Esta prueba no guarda nada. Si con tus SMS reales no acierta, pásame uno y
          ajusto la lectura.
        </p>
      </div>
    </Card>
  )
}
