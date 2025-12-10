import React from 'react';
import { Button } from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import AlertDiamond from '@react-spectrum/s2/icons/AlertDiamond';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and display React errors gracefully
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
    // Reload the page to reset state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '48px', height: '100vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
            <AlertDiamond />
            <h1 className={style({ font: 'heading-xl', margin: 0 })}>Something went wrong</h1>
            <span className={style({ font: 'body' })}>The application encountered an unexpected error.</span>
            {this.state.error && (
              <div
                style={{
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#f0f0f0',
                  maxWidth: '600px'
                }}
              >
                <span
                  className={style({ font: 'ui-sm', color: 'red-900' })}
                  style={{ fontFamily: 'monospace' }}
                >
                  {this.state.error.message}
                </span>
              </div>
            )}
            <Button variant="accent" onPress={this.handleReset}>
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
