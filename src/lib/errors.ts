export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly publicMessage: string;

  constructor(status: number, code: string, publicMessage: string, cause?: unknown) {
    super(publicMessage);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
    if (cause !== undefined) this.cause = cause;
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required', code = 'unauthorized') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'forbidden') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'not_found') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'conflict') {
    super(409, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', code = 'validation_error') {
    super(400, code, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', code = 'rate_limited') {
    super(429, code, message);
  }
}
