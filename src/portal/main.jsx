import React from 'react'
import ReactDOM from 'react-dom/client'
import PortalApp from './PortalApp.jsx'
import { KonfigProvider } from '../lib/konfig.jsx'
import { ToastProvider } from '../components/ui.jsx'
import { daftarPWA } from '../lib/pwa.js'
import '../index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KonfigProvider>
      <ToastProvider>
        <PortalApp />
      </ToastProvider>
    </KonfigProvider>
  </React.StrictMode>
)

daftarPWA()
