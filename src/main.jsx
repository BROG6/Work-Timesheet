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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
