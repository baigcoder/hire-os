/**
 * Structured logger (pino) with per-request context.
 *
 * Keeps the original API so existing callers are unchanged:
 *   logger.info(message, meta?)   logger.warn(message, meta?)
 *   logger.debug(message, meta?)  logger.error(message, errorOrMeta?)
 *
 * Every line logged while handling a request automatically carries that
 * request's requestId (and userId once authenticated), via AsyncLocalStorage.
 */
import { AsyncLocalStorage } from "async_hooks";
import pino from "pino";

const requestContext = new AsyncLocalStorage();

const defaultLevel = () => {
  if (process.env.NODE_ENV === "test") return "silent";
  if (process.env.NODE_ENV === "production") return "info";
  return "debug";
};

const base = pino({
  level: process.env.LOG_LEVEL || defaultLevel(),
  base: { service: "hireos-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Pull request-scoped fields into every log line
  mixin: () => {
    const store = requestContext.getStore();
    return store ? { ...store } : {};
  },
  redact: {
    paths: [
      "password",
      "token",
      "refreshToken",
      "apiKey",
      "authorization",
      "*.password",
      "*.token",
      "*.refreshToken",
      "*.apiKey",
      "*.authorization",
      "headers.cookie",
    ],
    censor: "[REDACTED]",
  },
});

const toMeta = (meta) => {
  if (meta === undefined || meta === null) return {};
  if (meta instanceof Error) return { err: meta };
  if (typeof meta === "object") return meta;
  return { detail: meta };
};

const wrap = (pinoLogger) => ({
  info: (message, meta) => pinoLogger.info(toMeta(meta), message),
  warn: (message, meta) => pinoLogger.warn(toMeta(meta), message),
  debug: (message, meta) => pinoLogger.debug(toMeta(meta), message),
  error: (message, error) => pinoLogger.error(toMeta(error), message),
  child: (bindings) => wrap(pinoLogger.child(bindings)),
  get level() {
    return pinoLogger.level;
  },
});

const logger = wrap(base);

/**
 * Run fn with request-scoped log fields. Mutating the returned store later
 * (e.g. adding userId after auth) is reflected in subsequent log lines.
 */
export const runWithLogContext = (store, fn) => requestContext.run(store, fn);

export const getLogContext = () => requestContext.getStore();

export default logger;
