import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "A metropolitan system error has occurred.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) displayMessage = `Security Alert: ${parsed.error}`;
      } catch (e) {
        displayMessage = this.state.error.message || displayMessage;
      }

      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
          <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mb-8">
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">System Disruption</h2>
          <p className="text-gray-500 font-medium max-w-md mb-10">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-10 py-5 bg-black text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl"
          >
            Reboot Metropolitan Core
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
