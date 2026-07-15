import { Outlet } from 'react-router-dom';

/**
 * Shell for public routes. Pages own their chrome (e.g. landing header).
 */
export function PublicLayout() {
  return <Outlet />;
}
