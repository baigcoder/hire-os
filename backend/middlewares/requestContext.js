import crypto from "crypto";
import logger, { runWithLogContext } from "../utils/logger.js";

const VALID_REQUEST_ID = /^[\w-]{1,64}$/;

/**
 * Assigns a request ID (reusing a well-formed incoming X-Request-Id), echoes
 * it back in the response, scopes it into every log line for the request and
 * logs one summary line when the response finishes.
 *
 * Stored on req.requestId — req.id is the authenticated user's ID here.
 */
const requestContext = (req, res, next) => {
  const incoming = req.get("x-request-id");
  const requestId =
    incoming && VALID_REQUEST_ID.test(incoming)
      ? incoming
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Math.round(
      Number(process.hrtime.bigint() - start) / 1e6,
    );
    const fields = {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs,
    };
    if (req.path.startsWith("/health")) {
      logger.debug("request completed", fields);
    } else if (res.statusCode >= 500) {
      logger.warn("request completed", fields);
    } else {
      logger.info("request completed", fields);
    }
  });

  runWithLogContext({ requestId }, next);
};

export default requestContext;
