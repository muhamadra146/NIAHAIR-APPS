'use strict';

// Level hierarchy: debug < info < warn < error
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const env      = process.env.NODE_ENV ?? 'development';
// Suppress all output in test; only info+ in production; debug+ in development
const minLevel = env === 'test' ? 99 : env === 'production' ? LEVELS.info : LEVELS.debug;
const isProd   = env === 'production';

const write = (level, message, meta) => {
  if (LEVELS[level] < minLevel) return;

  const ts = new Date().toISOString();

  if (isProd) {
    // Structured JSON for log aggregation (CloudWatch, Datadog, etc.)
    const line = JSON.stringify({ ts, level, message, ...(meta ?? {}) });
    process.stdout.write(line + '\n');
  } else {
    const tag = `[${ts}] [${level.toUpperCase().padEnd(5)}]`;
    const hasMeta = meta && Object.keys(meta).length > 0;
    const body = hasMeta ? `${message} ${JSON.stringify(meta)}` : message;
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`${tag} ${body}`);
  }
};

const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info:  (message, meta) => write('info',  message, meta),
  warn:  (message, meta) => write('warn',  message, meta),
  error: (message, meta) => write('error', message, meta),
};

module.exports = logger;
