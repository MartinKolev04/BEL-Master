import { AppError } from './AppError';

export class AuthError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}
