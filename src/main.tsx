import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { WalletProvider } from './lib/store'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>,
)
