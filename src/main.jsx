import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import App from './App'
import { ToastProvider } from './contexts/ToastContext'
import { WalletProvider } from './contexts/WalletContext'
import { wagmiConfig } from './config/wagmi'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Create a client for React Query (required by wagmi)
const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </WalletProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

