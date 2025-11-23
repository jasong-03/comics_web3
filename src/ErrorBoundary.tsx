import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark text-white font-mono p-8 text-center">
                    <h1 className="text-4xl text-neon-pink mb-4">SOMETHING WENT WRONG</h1>
                    <p className="text-xl mb-8 max-w-2xl">
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-4 bg-neon-lime text-brand-dark font-bold text-xl border-4 border-white hover:bg-white hover:scale-105 transition-all"
                    >
                        RELOAD PAGE
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
