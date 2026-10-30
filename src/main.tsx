import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'

import './index.css'

/**
 * React application entry point.
 *
 * StrictMode helps identify potential development issues.
 * The App component will eventually contain the application router.
 */
ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)