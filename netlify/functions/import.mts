import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'

/** Movimiento tal y como lo devuelve el modelo, antes de que el usuario lo revise. */
interface Detected {
  concepto: string
  importe: number
  moneda: 'AED' | 'EUR'
  categoria: string
  fecha: string | null
}

interface ImportRequest {
  images: Array<{ media_type: string; data: string }>
  categories: string[]
  month: string
}

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5'
const MAX_IMAGES = 4
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const matches = (given: string, expected: string) => {
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

const prompt = (categories: string[], month: string) => `Estas imágenes son capturas de la app del banco
o de la lista de movimientos del móvil de una pareja que vive en Dubai. Pueden venir de una grabación de
pantalla, así que varias imágenes seguidas muestran casi lo mismo mientras se hace scroll.

Extrae SOLO los gastos (cargos, pagos, compras). Reglas:
- No incluyas ingresos, abonos, devoluciones, traspasos entre cuentas propias ni saldos totales.
- Un mismo gasto que aparezca en varias imágenes se registra UNA sola vez.
- El importe siempre en positivo, con los decimales que se vean.
- La moneda es AED salvo que la captura indique euros.
- La fecha en formato AAAA-MM-DD solo si se ve con claridad; si solo se ve el día, usa el mes ${month}.
  Si no hay fecha visible, deja null.
- Copia el concepto tal y como aparece (el nombre del comercio), sin inventar.
- Asigna la categoría más adecuada de esta lista: ${categories.join(', ')}.
  Si ninguna encaja, usa "Otros".
- Si una imagen está borrosa o no es una lista de movimientos, ignórala.

Devuelve el resultado llamando a la herramienta registrar_gastos.`

export default async (request: Request) => {
  const password = process.env.APP_PASSWORD
  if (!password) return json({ error: 'Falta la variable de entorno APP_PASSWORD en Netlify' }, 500)
  if (!matches(request.headers.get('x-wallet-key') ?? '', password)) {
    return json({ error: 'Contraseña incorrecta' }, 401)
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: 'Falta la variable de entorno ANTHROPIC_API_KEY en Netlify' }, 500)
  }
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  let body: ImportRequest
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Cuerpo de la petición inválido' }, 400)
  }

  const images = (body.images ?? []).filter((image) => ALLOWED_TYPES.includes(image.media_type))
  if (images.length === 0) return json({ error: 'No hay imágenes que leer' }, 400)
  if (images.length > MAX_IMAGES) {
    return json({ error: `Máximo ${MAX_IMAGES} imágenes por petición` }, 400)
  }

  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model: MODEL,
      // Suficiente para un centenar de movimientos; mantiene la respuesta dentro
      // del tiempo máximo de una función de Netlify
      max_tokens: 8000,
      // Leer una lista de movimientos es una extracción directa, no requiere análisis
      output_config: { effort: 'low' },
      messages: [{
        role: 'user',
        content: [
          ...images.map((image) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: image.media_type as 'image/jpeg', data: image.data },
          })),
          { type: 'text' as const, text: prompt(body.categories ?? [], body.month) },
        ],
      }],
      tools: [{
        name: 'registrar_gastos',
        description: 'Registra los gastos leídos en las capturas de pantalla.',
        strict: true,
        input_schema: {
          type: 'object',
          properties: {
            gastos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  concepto: { type: 'string', description: 'Nombre del comercio o del cargo' },
                  importe: { type: 'number', description: 'Importe en positivo' },
                  moneda: { type: 'string', enum: ['AED', 'EUR'] },
                  categoria: { type: 'string' },
                  fecha: { type: ['string', 'null'], description: 'AAAA-MM-DD o null' },
                },
                required: ['concepto', 'importe', 'moneda', 'categoria', 'fecha'],
                additionalProperties: false,
              },
            },
          },
          required: ['gastos'],
          additionalProperties: false,
        },
      }],
      tool_choice: { type: 'tool', name: 'registrar_gastos' },
    })

    if (response.stop_reason === 'refusal') {
      return json({ error: 'El modelo no ha podido leer estas imágenes' }, 422)
    }

    const call = response.content.find((block) => block.type === 'tool_use')
    const detected = (call?.input as { gastos?: Detected[] } | undefined)?.gastos ?? []

    return json({
      movements: detected.filter((item) => Number.isFinite(item.importe) && item.importe > 0),
      truncated: response.stop_reason === 'max_tokens',
    })
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return json({ error: 'La clave ANTHROPIC_API_KEY no es válida' }, 502)
    }
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: 'Demasiadas peticiones seguidas, prueba en un minuto' }, 429)
    }
    if (error instanceof Anthropic.APIError) {
      return json({ error: `Error al leer las imágenes (${error.status})` }, 502)
    }
    return json({ error: (error as Error).message }, 500)
  }
}

export const config: Config = { path: '/api/import' }
