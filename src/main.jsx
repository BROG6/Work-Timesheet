// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Auto-reload the app if a user tries to load a stale JS module after a deployment
window.addEventListener('error', (e) => {
  if (
    /Loading chunk .* failed/i.test(e.message) ||
    /Failed to fetch dynamically imported module/i.test(e.message) ||
    /Importing a module script failed/i.test(e.message)
  ) {
    console.warn("Stale app bundle detected after new build. Refreshing page...");
    window.location.reload();
  }
});

// Register the Service Worker for iPhone / Web push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
