export interface RequestLog {
  id: string;
  tunnelId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: Date;
}
