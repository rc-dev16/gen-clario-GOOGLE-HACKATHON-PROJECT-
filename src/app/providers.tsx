import { AuthProvider } from '@/features/auth/context/AuthContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

/** App-wide providers. React Query is added in the data-layer todo. */
export function AppProviders({ children }: AppProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
