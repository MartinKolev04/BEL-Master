import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FirestoreService } from '../firebase/FirestoreService';
import { OperationType } from '../../errors';
import type { Grade } from '../../types';

export interface QuizResultPayload {
  userId: string;
  category: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  grade: Grade | null;
}

export class QuizResultsRepository extends FirestoreService {
  private readonly collectionPath = 'quizzes';

  constructor() {
    super();
  }

  public async record(payload: QuizResultPayload): Promise<void> {
    return this.run(OperationType.WRITE, this.collectionPath, async () => {
      await addDoc(collection(this.db, this.collectionPath), {
        ...payload,
        timestamp: serverTimestamp(),
      });
    });
  }
}

export const quizResultsRepository = new QuizResultsRepository();
