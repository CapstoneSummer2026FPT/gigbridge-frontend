import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { googleMeetAPI } from '../../../api/googleMeetAPI';

const GOOGLE_MEET_AUTH_FLOW = 'google-meet-oauth';

/**
 * This screen is shown in the OAuth popup window after Google redirects.
 * It posts the result to the opener (main window) and closes itself.
 */
export default function GoogleMeetOAuthCallbackScreen() {
  const [searchParams] = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const state = searchParams.get('state') || '';
    const code = searchParams.get('code') || '';
    const error = searchParams.get('error') || '';
    const result = searchParams.get('result') || '';

    async function completeFlow() {
      // If we have state/code, complete via the API
      if (state && code) {
        const response = await googleMeetAPI.completeCallback(state, code, null);
        const outcome = response.data?.result || 'failed';
        notifyOpener(outcome);
      } else if (error === 'access_denied') {
        notifyOpener('cancelled');
      } else if (result === 'missing_state') {
        notifyOpener('missing_state');
      } else if (result === 'processing') {
        // The backend redirects here; we're processing this in the popup
        // The state/code are in the URL params already handled above
      } else {
        notifyOpener('unknown');
      }
    }

    completeFlow().catch(() => notifyOpener('failed'));
  }, [searchParams]);

  function notifyOpener(outcome: string) {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: GOOGLE_MEET_AUTH_FLOW, result: outcome },
          window.location.origin
        );
      }
    } catch {
      // Cross-origin or blocked - ignore
    }

    // Close popup after a short delay
    setTimeout(() => {
      window.close();
    }, 500);
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      color: '#666'
    }}>
      <p>Completing Google Meet authentication...</p>
    </div>
  );
}
