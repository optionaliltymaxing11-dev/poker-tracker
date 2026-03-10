import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './ThemeContext';
import './index.css';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div style={{padding: 20, color: 'red'}}><h1>Error</h1><pre>{this.state.error.message}{'\n'}{this.state.error.stack}</pre></div>;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </ErrorBoundary>
);
