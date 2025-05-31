import { render, screen } from '@testing-library/react';
import { AuthProvider } from 'react-oidc-context';
import App from './App';

// Mock OIDC configuration
const oidcConfig = {
  authority: 'https://test.auth.com',
  client_id: 'test-client',
  redirect_uri: 'http://localhost:3000',
};

test('renders app with loading state', () => {
  render(
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  );
  // Check if loading text appears (since auth will be in loading state)
  const loadingElement = screen.getByText(/loading/i);
  expect(loadingElement).toBeInTheDocument();
});
