import { Component } from 'react';
import Icon from './Icon';

/** Stops one broken component from blanking the whole application. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    const { children } = this.props;

    if (!error) return children;

    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Icon name="broken_image" size={48} className="text-error" />
        <h1 className="text-headline-md font-semibold">Something broke on this page</h1>
        <p className="max-w-md text-sm text-on-surface-variant">
          The error has been logged to the browser console. Reloading usually clears it.
        </p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </div>
    );
  }
}
