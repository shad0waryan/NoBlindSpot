import { Component } from "react";
import { APP_CONFIG } from "../config/appConfig";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
          <div className="text-center max-w-md animate-slide-up">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="font-display font-bold text-xl text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-6">An unexpected error occurred. Try refreshing the page.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/20">
                Refresh Page
              </button>
              <a href="/dashboard"
                className="px-5 py-2.5 rounded-xl border border-surface-border text-sm text-slate-400 hover:text-white hover:bg-surface-hover transition-all font-medium">
                Go Home
              </a>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400 transition-colors">Error details</summary>
                <pre className="mt-2 text-[10px] text-red-400/60 bg-red-500/5 border border-red-500/10 rounded-xl p-3 overflow-auto max-h-32 font-mono">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <p className="text-[11px] text-slate-600 mt-8">{APP_CONFIG.name} v{APP_CONFIG.version}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
