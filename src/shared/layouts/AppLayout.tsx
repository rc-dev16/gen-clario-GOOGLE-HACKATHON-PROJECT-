import { Outlet } from 'react-router-dom';
import AppHeader from '@/shared/components/AppHeader';

/**
 * Shell for authenticated app pages — header once, page content via Outlet.
 */
export function AppLayout() {
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}
