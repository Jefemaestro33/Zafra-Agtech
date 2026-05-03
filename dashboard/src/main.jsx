import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider, useToast } from './components/Toast'
import { setApiErrorHandler } from './hooks/useApi'
import App from './App'
import './index.css'
import { migrateAgtechToZafra } from './utils/migrateLocalStorage'

migrateAgtechToZafra()

// Bridge: connect useApi errors to toast system
function ApiToastBridge({ children }) {
  const toast = useToast()
  useEffect(() => {
    setApiErrorHandler((msg) => toast.error(msg))
    return () => setApiErrorHandler(null)
  }, [toast])
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ApiToastBridge>
            <App />
          </ApiToastBridge>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
