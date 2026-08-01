import { Navigate } from 'react-router';

/** Compatibility component for older imports; audit activity is served by the real audit-log screen. */
export default function AdminSystemTrackingScreen() {
  return <Navigate to="/admin/audit-logs" replace />;
}
