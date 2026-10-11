import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AdminApp from './AdminApp.jsx'
import { KonfigProvider } from '../lib/konfig.jsx'
import { ToastProvider } from '../components/ui.jsx'
import { daftarPWA } from '../lib/pwa.js'
import '../index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KonfigProvider>
      <ToastProvider>
        <BrowserRouter basename="/admin">
          <AdminApp />
        </BrowserRouter>
      </ToastProvider>
    </KonfigProvider>
  </React.StrictMode>
)

daftarPWA()
