import React, { StrictMode, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false, error: null };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: '#D0021B', background: '#FFF5F5', borderRadius: '12px', border: '1px solid #EFA9A9' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>系统运行异常</h1>
          <p style={{ fontSize: '14px', margin: '10px 0' }}>检测到应用发生错误，请刷新页面或检查网络配置。</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', background: '#FFF', padding: '10px', borderRadius: '8px' }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
