import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'

// Initialize Google Auth early on native platforms
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize({
    clientId: '986683715840-4rlu9o0a5glc1dquec2ljolbo0iom3iv.apps.googleusercontent.com',
    serverClientId: '986683715840-4rlu9o0a5glc1dquec2ljolbo0iom3iv.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
