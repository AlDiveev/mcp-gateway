type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogFields {
  [key: string]: unknown;
}

const SERVICE = process.env.SERVICE_NAME ?? 'mcp-gateway';
const ENV = process.env.NODE_ENV ?? 'development';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const rawLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const MIN_LEVEL: Level = (['debug', 'info', 'warn', 'error'] as Level[]).includes(rawLevel as Level)
  ? (rawLevel as Level)
  : 'info';

function emit(level: Level, message: string, fields: LogFields = {}): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[MIN_LEVEL]) return;
  const record = {
    '@timestamp': new Date().toISOString(),
    level,
    message,
    service: SERVICE,
    env: ENV,
    ...fields,
  };
  const line = JSON.stringify(record);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit('debug', msg, fields),
  info: (msg: string, fields?: LogFields) => emit('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => emit('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => emit('error', msg, fields),
};
