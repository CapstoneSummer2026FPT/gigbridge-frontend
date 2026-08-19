import { hydrateRoot } from 'react-dom/client';
import type { User } from '../../types/models/User';
import { secureStorage } from '../../shared/utils/secureStorage';
import { getPublicRouteRedirect } from '../../app/utils/publicRouteRedirect';
import LandingPage from './LandingPage';
import './styles/landing-page.css';

interface StoredSession {
  readonly user?: User;
}

const getStoredUser = (): User | null => {
  const session = secureStorage.getItem<StoredSession>('gigbridge_session');
  return session?.user ?? secureStorage.getItem<User>('gigbridge_user');
};

const redirectPath = getPublicRouteRedirect(getStoredUser());
const root = document.getElementById('landing-root');

if (redirectPath) {
  window.location.replace(redirectPath);
} else if (root) {
  hydrateRoot(root, <LandingPage />);
}
