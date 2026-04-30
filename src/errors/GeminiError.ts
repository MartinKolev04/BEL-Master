import { AppError } from './AppError';

export class GeminiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}
