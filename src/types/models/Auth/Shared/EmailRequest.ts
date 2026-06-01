export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  isHtml: boolean;
  attachments?: string[] | null;
}
