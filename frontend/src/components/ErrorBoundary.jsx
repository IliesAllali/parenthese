import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui, sans-serif',
          color: '#4a3728',
          background: '#faf6f1',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Une erreur inattendue est survenue
          </h1>
          <p style={{ color: '#8a7568', marginBottom: '1.5rem', maxWidth: '400px' }}>
            L application a rencontre un probleme. Vous pouvez essayer de recharger ou revenir a l ecran precedent.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid #c4b5a8',
                background: 'white',
                color: '#4a3728',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Reessayer
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                background: '#4a3728',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Recharger la page
            </button>
          </div>
          {this.state.error && (
            <pre style={{
              marginTop: '2rem',
              padding: '1rem',
              background: '#f0ebe4',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#8a7568',
              maxWidth: '600px',
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
