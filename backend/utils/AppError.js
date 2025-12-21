/**
 * Centralized Application Error Class
 * Provides consistent error handling across the application
 */
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.code = code;
    this.isOperational = true; // Operational errors are expected errors

    Error.captureStackTrace(this, this.constructor);
  }

  // Common error factory methods
  static badRequest(message, code = "BAD_REQUEST") {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = "Unauthorized access", code = "UNAUTHORIZED") {
    return new AppError(message, 401, code);
  }

  static forbidden(message = "Access forbidden", code = "FORBIDDEN") {
    return new AppError(message, 403, code);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new AppError(message, 404, code);
  }

  static conflict(message, code = "CONFLICT") {
    return new AppError(message, 409, code);
  }

  static tooManyRequests(message = "Too many requests", code = "RATE_LIMITED") {
    return new AppError(message, 429, code);
  }

  static internal(message = "Internal server error", code = "INTERNAL_ERROR") {
    return new AppError(message, 500, code);
  }

  static validationError(errors) {
    const error = new AppError("Validation failed", 400, "VALIDATION_ERROR");
    error.errors = errors;
    return error;
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      code: this.code,
      ...(this.errors && { errors: this.errors }),
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };
  }
}

export default AppError;
