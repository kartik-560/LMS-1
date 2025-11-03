import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <GoogleOAuthProvider clientId="413119062168-m7oqvf4hgq1k9k2ghr4p3j3v6dfv6tr0.apps.googleusercontent.com">
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </BrowserRouter>
  </GoogleOAuthProvider>
  // </React.StrictMode>,
)
