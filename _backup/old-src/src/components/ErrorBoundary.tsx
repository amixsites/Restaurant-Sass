import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { AlertOctagon } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('SYSTEM', 'REACT_RENDER_CRASH', { error, errorInfo }, 'Global ErrorBoundary caught an exception.');
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-6">
            <AlertOctagon className="w-16 h-16 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold mb-4 tracking-tight">Something went wrong!</h1>
          <p className="text-muted-foreground max-w-md mb-8">
            The application encountered a critical error. The engineering team has been notified via the logs.
          </p>
          <div className="bg-muted p-4 rounded-xl text-left w-full max-w-2xl overflow-auto mb-8 border border-border">
            <pre className="text-xs text-red-500 font-mono whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
          </div>
          <Button 
            size="lg" 
            className="rounded-xl px-8"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
