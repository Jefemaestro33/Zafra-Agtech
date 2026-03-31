import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '300px', padding: '2rem',
          background: 'var(--color-surface-1, #111318)',
          borderRadius: '12px', margin: '1rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
            &#9888;
          </div>
          <h2 style={{ color: 'var(--color-text-primary, #f0f2f5)', marginBottom: '0.5rem' }}>
            Algo salio mal
          </h2>
          <p style={{ color: 'var(--color-text-secondary, #9ca3b4)', marginBottom: '1.5rem', maxWidth: '400px' }}>
            {this.state.error?.message || 'Error inesperado en la aplicacion.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none',
              background: 'var(--color-accent-green, #10b981)', color: '#fff',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
