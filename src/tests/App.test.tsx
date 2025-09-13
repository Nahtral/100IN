import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AppProviders } from '@/components/providers/AppProviders';

// Mock router for testing
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div data-testid="routes">{children}</div>,
  Route: ({ children }: { children: React.ReactNode }) => <div data-testid="route">{children}</div>,
  Navigate: () => <div data-testid="navigate" />,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

describe('App Stability Tests', () => {
  it('should render without crashing and mount providers', async () => {
    const TestComponent = () => {
      const [count, setCount] = React.useState(0);
      
      React.useEffect(() => {
        setCount(1);
      }, []);

      return <div data-testid="test-component">Count: {count}</div>;
    };

    render(
      <AppProviders>
        <TestComponent />
      </AppProviders>
    );

    expect(screen.getByTestId('router')).toBeInTheDocument();
    
    // Wait for component to mount and useEffect to run
    const testComponent = await screen.findByTestId('test-component');
    expect(testComponent).toHaveTextContent('Count: 1');
  });

  it('should handle useState and useEffect without null errors', () => {
    const HookTestComponent = () => {
      const [state1, setState1] = React.useState('initial');
      const [state2, setState2] = React.useState(0);
      const [state3, setState3] = React.useState<string | null>(null);

      React.useEffect(() => {
        setState1('updated');
        setState2(42);
        setState3('not null');
      }, []);

      return (
        <div>
          <span data-testid="state1">{state1}</span>
          <span data-testid="state2">{state2}</span>
          <span data-testid="state3">{state3 || 'null'}</span>
        </div>
      );
    };

    render(
      <AppProviders>
        <HookTestComponent />
      </AppProviders>
    );

    expect(screen.getByTestId('state1')).toHaveTextContent('updated');
    expect(screen.getByTestId('state2')).toHaveTextContent('42');
    expect(screen.getByTestId('state3')).toHaveTextContent('not null');
  });

  it('should not have multiple React instances', () => {
    // Test that React.version exists and is consistent
    expect(React.version).toBeDefined();
    expect(typeof React.version).toBe('string');
    
    // Check that React hooks work consistently
    let hookCallCount = 0;
    
    const ConsistencyTest = () => {
      React.useState(() => {
        hookCallCount++;
        return 'test';
      });
      
      return <div data-testid="consistency">Hooks work</div>;
    };

    render(
      <AppProviders>
        <ConsistencyTest />
      </AppProviders>
    );

    expect(screen.getByTestId('consistency')).toBeInTheDocument();
    expect(hookCallCount).toBe(1); // Should only be called once
  });
});