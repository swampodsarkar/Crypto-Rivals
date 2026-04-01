import * as React from 'react';
import { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mobile-container flex flex-col items-center justify-center bg-bg-dark px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/30">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest font-gaming uppercase mb-2">System Crash</h1>
          <p className="text-text-muted text-sm font-rajdhani font-bold tracking-widest uppercase mb-8">
            An unexpected error occurred in the arena.
          </p>
          
          <div className="w-full bg-bg-card border border-border rounded-xl p-4 mb-8 overflow-hidden">
            <p className="text-red-400 text-[10px] font-mono text-left break-all opacity-70">
              {this.state.error?.message || 'Unknown Error'}
            </p>
          </div>

          <button
            onClick={this.handleReset}
            className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-primary to-blue-600 py-4 rounded-xl font-black text-white shadow-neon-primary active:scale-95 transition-all"
          >
            <RefreshCw size={20} />
            <span className="uppercase tracking-widest">Restart Game</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
