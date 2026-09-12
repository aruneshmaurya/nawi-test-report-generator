import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-600 mb-4">
              An unexpected error occurred while rendering this view.
            </p>
            {this.state.error && (
              <div className="mb-6 rounded-lg bg-slate-100 p-3 text-left font-mono text-xs text-rose-700 max-h-32 overflow-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex justify-center space-x-3">
              <Button onClick={this.handleReset} className="bg-[#0b2545] hover:bg-[#134074]">
                <RotateCcw className="mr-2 h-4 w-4" /> Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
