import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { applyOp } from './src/lib/apply'
import { migrate } from './src/lib/migrate'
import type { WalletData } from './src/lib/types'

const LOCAL_DB = '.local-wallet.json'
const SEED = 'src/data/seed.json'

/**
 * Copia local de la función de Netlify para `npm run dev`: guarda en un fichero
 * en lugar de en Netlify Blobs, así se puede trabajar sin desplegar.
 */
const localApi = (): Plugin => ({
  name: 'familywallet-local-api',
  configureServer(server) {
    const load = (): WalletData =>
      migrate(JSON.parse(readFileSync(existsSync(LOCAL_DB) ? LOCAL_DB : SEED, 'utf8')))

    server.middlewares.use('/api/data', (request, response, next) => {
      if (request.headers['x-wallet-key'] !== (process.env.APP_PASSWORD ?? 'dubai')) {
        response.statusCode = 401
        return response.end(JSON.stringify({ error: 'Contraseña incorrecta' }))
      }
      response.setHeader('content-type', 'application/json')

      if (request.method === 'GET') return response.end(JSON.stringify({ data: load() }))
      if (request.method !== 'POST') return next()

      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.on('end', () => {
        try {
          const { ops } = JSON.parse(Buffer.concat(chunks).toString())
          const data = ops.reduce(applyOp, load())
          writeFileSync(LOCAL_DB, JSON.stringify(data, null, 2))
          response.end(JSON.stringify({ data }))
        } catch (error) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: (error as Error).message }))
        }
      })
    })
  },
})

export default defineConfig({
  plugins: [react(), localApi()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      // recharts pesa más que la app: en su propio chunk se cachea aparte
      output: { manualChunks: { charts: ['recharts'] } },
    },
  },
})
