/**
 * Custom logger utility to replace console.log with structured logging.
 * Mimics Winston-like API for future compatibility.
 */
const logger = {
  info: (message, meta = {}) => {
    console.log(
      JSON.stringify({
        level: "info",
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      }),
    );
  },
  error: (message, error) => {
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { error };

    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        message,
        ...errorDetails,
      }),
    );
  },
  warn: (message, meta = {}) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      }),
    );
  },
  debug(message, ...args) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        JSON.stringify({
          level: "debug",
          timestamp: new Date().toISOString(),
          message,
          ...args[0], // Spread the first arg if it's an object
        }),
      );
    }
  },
};

export default logger;
