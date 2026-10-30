import './App.css'

/**
 * Root application component.
 *
 * This is a temporary starting screen.
 *
 * Once the shared layout and router are implemented,
 * this component will render the application navigation.
 */
function App() {
  return (
    <main className="app-container">
      <div className="app-welcome">
        <h1>PDF Field Mapper</h1>

        <p>
          Application setup complete.
        </p>

        <span>
          Ready to begin development.
        </span>
      </div>
    </main>
  )
}

export default App