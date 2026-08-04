import { googleMeetGetAPI, type GoogleMeetConnectionStatus } from './GET';
import { googleMeetPostAPI, type AuthorizationUrlResult } from './POST';

export type { GoogleMeetConnectionStatus, AuthorizationUrlResult };
export { googleMeetGetAPI, googleMeetPostAPI };

export const googleMeetAPI = {
  ...googleMeetGetAPI,
  ...googleMeetPostAPI,
};
