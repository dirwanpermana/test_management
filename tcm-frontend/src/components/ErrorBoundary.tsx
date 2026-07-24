// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <h1>Terjadi kesalahan</h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>Muat Ulang</button>
        </div>
      );
    }
    return this.props.children;
  }
}