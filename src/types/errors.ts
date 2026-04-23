export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class TunnelOfflineError extends AppError {
  constructor() {
    super(502, 'Tunnel agent not connected');
  }
}

export class TunnelTimeoutError extends AppError {
  constructor() {
    super(504, 'Tunnel agent did not respond in time');
  }
}
