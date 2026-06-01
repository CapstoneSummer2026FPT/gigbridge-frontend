export interface EmailSettingsDTO {
  host: string;
  port: number;
  username: string;
  password?: string | null;
  enableSSL: boolean;
}
