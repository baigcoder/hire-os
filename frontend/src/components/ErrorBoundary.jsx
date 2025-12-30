import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './ui/button';

/**
 * ErrorBoundary - Catches JavaScript errors anywhere in the child component tree
 * Logs errors and displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console (could also send to error tracking service)
        console.error('ErrorBoundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);

        this.setState({
            error: error,
            errorInfo: errorInfo,
        });

        // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
        // if (typeof window !== 'undefined' && window.Sentry) {
        //   window.Sentry.captureException(error, { extra: errorInfo });
        // }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
                    <div className="max-w-lg w-full">
                        {/* Error Container */}
                        <div className="bg-[#111111] border border-red-500/20 rounded-lg p-8 text-center relative overflow-hidden">
                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/30" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500/30" />

                            {/* Icon */}
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider">
                                System Error
                            </h1>

                            {/* Subtitle */}
                            <p className="text-gray-400 mb-6 font-mono text-sm">
                                An unexpected error has occurred. Our team has been notified.
                            </p>

                            {/* Error Details (Development only) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="bg-black/50 border border-red-500/10 rounded p-4 mb-6 text-left overflow-auto max-h-40">
                                    <p className="text-red-400 font-mono text-xs mb-2">
                                        <Bug className="w-3 h-3 inline mr-1" />
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <pre className="text-gray-500 text-[10px] whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    onClick={this.handleRetry}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-sm"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Try Again
                                </Button>
                                <Button
                                    onClick={this.handleGoHome}
                                    className="bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 rounded-sm"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Go Home
                                </Button>
                            </div>

                            {/* Error Code */}
                            <p className="text-gray-600 font-mono text-[10px] mt-6 uppercase">
                                Error ID: {Date.now().toString(36).toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
