import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  showDetails: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    window.location.href = '/';
  };

  handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Could not clear storage", e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      let displayMessage = "A temporary system disruption was intercepted.";
      let technicalDetail = "";
      let isSecurityAlert = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            isSecurityAlert = true;
            displayMessage = `Database Restriction: ${parsed.error}`;
            technicalDetail = JSON.stringify(parsed, null, 2);
          }
        }
      } catch (e) {
        displayMessage = this.state.error?.message || displayMessage;
        technicalDetail = this.state.error?.stack || String(this.state.error);
      }

      if (!technicalDetail) {
        technicalDetail = this.state.error?.stack || String(this.state.error || "No stack trace available.");
      }

      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 md:p-12 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl shadow-red-500/10 border border-red-100">
            <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-red-600" />
          </div>

          <span className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-[9px] font-black uppercase tracking-widest mb-4">
            {isSecurityAlert ? 'Security Safeguard' : 'Runtime Exception Intercepted'}
          </span>

          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">
            System Disruption
          </h2>

          <p className="text-gray-600 font-medium text-sm md:text-base leading-relaxed mb-8 max-w-lg">
            {displayMessage}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-10 w-full">
            <button 
              type="button"
              onClick={() => this.setState({ hasError: false, error: null, showDetails: false })}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>

            <button 
              type="button"
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-black hover:bg-gray-800 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reboot Metropolitan Core
            </button>

            <button 
              type="button"
              onClick={this.handleReset}
              className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4 text-orange-600" />
              Return to Home Hub
            </button>

            <button 
              type="button"
              onClick={this.handleClearCache}
              className="px-6 py-4 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 rounded-2xl uppercase tracking-widest text-[9px] font-black transition-all flex items-center gap-2 cursor-pointer"
              title="Clear cached data and reload"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Cache & Reload
            </button>
          </div>

          {/* Diagnostic Details Accordion */}
          <div className="w-full text-left bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              className="w-full px-5 py-3.5 flex items-center justify-between text-gray-500 hover:text-black text-[10px] font-black uppercase tracking-wider cursor-pointer"
            >
              <span>Technical Diagnostics</span>
              {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {this.state.showDetails && (
              <div className="p-5 pt-0 border-t border-gray-200/60 font-mono text-[11px] text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-48 scrollbar-thin">
                {technicalDetail}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

