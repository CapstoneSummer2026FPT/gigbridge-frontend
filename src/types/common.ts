export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}

export interface ApiError {
  message: string;
  status: number | null;
  response?: any;
}

export interface AppLog {
  _id: string;
  timestamp: string;
  level: string;
  message: string;
  meta: {
    method: string;
    url: string;
    status: number;
    response_time: number;
    ip: string;
    origin: string;
    host: string;
    userAgent: string;
    body: any;
  };
}
