import { Component, type ReactNode } from 'react';

/** Fångar oväntade fel så att skärmen aldrig blir svart. Din data påverkas inte. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Jarvis kraschade:', error);
  }

  render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    return (
      <div style={{ minHeight: '100dvh', background: '#173f31', color: '#f4f1e6', fontFamily: 'Inter, system-ui, sans-serif', padding: '64px 20px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 30, margin: 0 }}>Något gick fel</h1>
          <p style={{ color: '#b9cbbf' }}>Jarvis stötte på ett fel. Din data är sparad och påverkas inte. Ladda om sidan. Om felet kommer tillbaka, skicka texten nedan till den som bygger appen.</p>
          <button type="button" onClick={() => location.reload()} style={{ minHeight: 48, padding: '0 20px', borderRadius: 12, border: 0, background: '#e9b44c', color: '#2b1f05', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Ladda om
          </button>
          <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap', fontSize: 12, color: '#b9cbbf', background: 'rgba(0,0,0,.25)', padding: 12, borderRadius: 10 }}>{e.message}</pre>
        </div>
      </div>
    );
  }
}
