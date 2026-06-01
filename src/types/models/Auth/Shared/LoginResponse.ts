import { UserDTO } from './UserDTO';

export interface LoginResponse {
  user: UserDTO;
  token: string;
  refreshToken?: string;
}
