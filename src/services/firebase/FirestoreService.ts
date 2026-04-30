import { type Firestore } from 'firebase/firestore';
import { db, auth } from './firebaseClient';
import { FirestoreOperationError, OperationType } from '../../errors';

export abstract class FirestoreService {
  protected readonly db: Firestore;

  protected constructor(database: Firestore = db) {
    this.db = database;
  }

  protected async run<T>(
    operation: OperationType,
    path: string | null,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : String(cause);
      const error = new FirestoreOperationError(message, {
        operationType: operation,
        path,
        userId: auth.currentUser?.uid ?? null,
        email: auth.currentUser?.email ?? null,
      }, cause);
      console.error('Firestore Error:', JSON.stringify(error.toJSON()));
      throw error;
    }
  }
}
