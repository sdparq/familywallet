import { useState } from 'react'
import { useWallet } from '../lib/store'

export default function Login() {
  const { signIn, error } = useWallet()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setFailure(null)
    try {
      await signIn(password)
    } catch (caught) {
      setFailure((caught as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Family Wallet</h1>
          <p className="mt-1 text-sm text-neutral-500">Introduce la contraseña compartida.</p>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          className="field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
        />
        {(failure ?? error) && <p className="text-sm text-red-700">{failure ?? error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
