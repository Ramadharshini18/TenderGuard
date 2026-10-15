import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '60px auto', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h2 style={{ color: '#b91c1c', marginTop: 0 }}>Application Render Notice</h2>
          <p style={{ color: '#4b5563', fontSize: '14px' }}>An interface error occurred while rendering the page:</p>
          <pre style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '13px', color: '#1e293b' }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '16px', padding: '10px 18px', background: '#0D3B2E', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Clear Session & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
