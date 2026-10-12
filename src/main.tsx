import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import { StudioProvider } from './publisher/context/StudioContext'
import './publisher/index.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <StudioProvider>
        <App />
      </StudioProvider>
    </ErrorBoundary>
  </StrictMode>,
)
