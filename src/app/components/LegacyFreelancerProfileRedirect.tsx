import { Navigate, useParams } from 'react-router';

export function LegacyFreelancerProfileRedirect() {
  const { id = '' } = useParams<{ id: string }>();
  return <Navigate to={`/freelancers/${encodeURIComponent(id)}`} replace />;
}
