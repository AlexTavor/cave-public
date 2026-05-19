import React from "react";
import posthog from "posthog-js";
import {
    FallbackContainer,
    FallbackMessage,
    FallbackTitle,
} from "./ErrorBoundary.styles";

export interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error) {
        console.error("RuntimeShell error boundary caught:", error);
        posthog.capture("runtime_error_caught", {
            error_message: error.message,
            error_name: error.name,
        });
    }

    render() {
        if (this.state.error) {
            return (
                <FallbackContainer role="alert">
                    <FallbackTitle>Runtime Shell Failure</FallbackTitle>
                    <FallbackMessage>
                        {this.state.error.message ||
                            "An unexpected error occurred."}
                    </FallbackMessage>
                </FallbackContainer>
            );
        }

        return this.props.children;
    }
}
