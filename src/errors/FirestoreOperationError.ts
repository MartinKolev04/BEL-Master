import { AppError } from './AppError';
import { OperationType } from './OperationType';

interface FirestoreErrorContext {
  operationType: OperationType;
  path: string | null;
  userId?: string | null;
  email?: string | null;
}

export class FirestoreOperationError extends AppError {
  public readonly operationType: OperationType;
  public readonly path: string | null;
  public readonly userId: string | null;
  public readonly email: string | null;

  constructor(message: string, context: FirestoreErrorContext, cause?: unknown) {
    super(message, cause);
    this.operationType = context.operationType;
    this.path = context.path;
    this.userId = context.userId ?? null;
    this.email = context.email ?? null;
  }

  public toJSON() {
    return {
      ...super.toJSON(),
      operationType: this.operationType,
      path: this.path,
      authInfo: { userId: this.userId, email: this.email },
    };
  }
}
