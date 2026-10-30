import { AppRouter } from './router/AppRouter'

/* =========================================================
   PDF FIELD MAPPER
   Root Application Component
   ========================================================= */

/**
 * Root application component.
 *
 * The application router manages navigation between
 * pages and renders the shared application layout.
 *
 * The global stylesheet is imported in main.tsx.
 */
function App() {

  return (
    <AppRouter />
  )
}

export default App