/**
 * ErrorBoundary component
 * ------------------------
 * Purpose:
 *   - Catches React rendering errors so the whole app does not crash.
 *   - Shows a friendly fallback message.
 *   - Provides a "Reload" button for recovery.
 *
 * Usage:
 *   Wrap <App /> inside ErrorBoundary in main.jsx
 */

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            maxWidth: "600px",
            margin: "2rem auto",
            padding: "1rem",
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <h2>Something went wrong 😢</h2>
          <p>{this.state.error?.message || "Unexpected error occurred"}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}
