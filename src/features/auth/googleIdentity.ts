export interface GoogleCodeClient {
  requestCode: () => void;
}

interface GoogleCodeResponse {
  code?: string;
}

interface GoogleCodeClientConfig {
  client_id: string;
  scope: string;
  ux_mode: 'popup';
  callback: (response: GoogleCodeResponse) => void;
}

interface GoogleOAuth2 {
  initCodeClient: (config: GoogleCodeClientConfig) => GoogleCodeClient;
}

interface GoogleIdentityWindow extends Window {
  google?: {
    accounts?: {
      oauth2?: GoogleOAuth2;
    };
  };
}

export const getGoogleOAuth2 = (): GoogleOAuth2 | null => {
  const googleWindow = window as GoogleIdentityWindow;
  return googleWindow.google?.accounts?.oauth2 ?? null;
};

export const hasCompletedStoredSetup = (serializedUser: string | null): boolean => {
  if (!serializedUser) return false;

  try {
    const parsed: unknown = JSON.parse(serializedUser);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      'is_setup' in parsed &&
      parsed.is_setup === true
    );
  } catch {
    return false;
  }
};
