import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRecover?: () => void;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Automatic recovery for chunk loading errors (common in lazy loading)
    if (this.isChunkError(error)) {
        console.warn('Chunk load error detected, attempting recovery...');
        this.props.onRecover?.();
        // Force reload once if not already done in main.tsx
        if (!sessionStorage.getItem('retry-chunk-load')) {
            sessionStorage.setItem('retry-chunk-load', '1');
            window.location.reload();
        }
    }
  }

  private isChunkError(error: Error): boolean {
    const messages = [
        'Failed to fetch dynamically imported module',
        'Importing a module script failed',
        'Loading chunk'
    ];
    return messages.some(msg => error.message.includes(msg));
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            background: 'var(--bg-surface)', 
            borderRadius: '12px',
            border: '1px solid var(--border)',
            margin: '1rem'
        }}>
          <h2 style={{ color: 'var(--text-bright)' }}>Oops! Something went wrong.</h2>
          <p style={{ color: 'var(--text-mid)' }}>The page failed to load. Please try refreshing.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                background: 'var(--text-bright)',
                color: 'var(--bg-deep)',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '1rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
