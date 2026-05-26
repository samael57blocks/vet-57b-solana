import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.tsx'
import { SolanaProvider } from './solana/provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaProvider>
      <RouterProvider router={router} />
    </SolanaProvider>
  </StrictMode>,
)
