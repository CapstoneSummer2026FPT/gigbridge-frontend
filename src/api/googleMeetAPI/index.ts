import { googleMeetGetAPI, type GoogleMeetConnectionStatus } from './GET';
import { googleMeetPostAPI, type AuthorizationUrlResult, type CreateGoogleMeetMessageRequest } from './POST';

export type { GoogleMeetConnectionStatus, AuthorizationUrlResult, CreateGoogleMeetMessageRequest };
export { googleMeetGetAPI, googleMeetPostAPI };

export const googleMeetAPI = {
  ...googleMeetGetAPI,
  ...googleMeetPostAPI,
};
