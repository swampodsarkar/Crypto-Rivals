import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mobile-container bg-bg-dark flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 border border-red-500/50">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-black text-white font-gaming uppercase mb-4 tracking-widest">System Error</h1>
          <p className="text-text-muted font-rajdhani text-sm mb-8 leading-relaxed uppercase tracking-widest">
            Something went wrong in the arena. Please restart the application.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 rounded-xl font-black text-white shadow-neon-primary uppercase tracking-widest font-gaming"
          >
            Restart App
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-black/50 rounded-xl text-red-400 text-[10px] text-left overflow-auto max-w-full font-mono">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
