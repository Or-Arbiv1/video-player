import { Component, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches render-time errors anywhere below it so the page shows a message instead of going blank. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.fallback}>
          <p>Something went wrong.</p>
          <p>Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
