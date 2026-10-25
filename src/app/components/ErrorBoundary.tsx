import React from 'react';
import { isRouteErrorResponse, useRouteError, Link } from 'react-router';

function ErrorScreen({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-[#fce8e8] text-[#810100] flex items-center justify-center text-2xl font-bold">!</div>
        <h1 className="text-xl font-bold text-[#630000] mb-2">{title}</h1>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry ?? (() => window.location.reload())}
            className="px-5 py-2.5 rounded-xl bg-[#810100] text-white font-semibold hover:bg-[#630000] transition-colors"
          >
            Try again
          </button>
          <a href="/" className="px-5 py-2.5 rounded-xl border-2 border-gray-200 font-semibold text-gray-700 hover:border-[#810100] transition-colors">
            Go to login
          </a>
        </div>
      </div>
    </div>
  );
}

function describe(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied') return "You don't have permission to view this data.";
  if (code === 'unavailable') return 'Network problem — check your connection and try again.';
  if (code === 'resource-exhausted') return 'The demo has hit its daily usage limit. Please try again tomorrow.';
  return 'Something went wrong while loading this page.';
}

/**
 * Route-level boundary. createBrowserRouter catches render errors inside
 * routes itself, so this (not the class below) is what shows for page crashes.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  if (error) console.error('Route error:', error);

  // No error = rendered by the "*" catch-all route.
  if (!error || (isRouteErrorResponse(error) && error.status === 404)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F5F5F5]">
        <h1 className="text-3xl font-bold text-[#810100]">404</h1>
        <p className="text-gray-600">This page doesn't exist.</p>
        <Link to="/" className="text-[#810100] font-semibold underline">Back to login</Link>
      </div>
    );
  }
  return <ErrorScreen title="Oops! Page crashed" message={describe(error)} />;
}

/**
 * App-level boundary for anything outside the router (providers, toasts…).
 */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Hook a reporting service (e.g. Sentry free tier) in here if you add one.
    console.error('Uncaught app error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          title="Something went wrong"
          message={describe(this.state.error)}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
