import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import type { LeaderboardEntry } from '../../types';

export class LeaderboardRepository {
  private readonly collectionPath = 'users';
  private readonly defaultLimit = 10;

  public observeTop(
    onChange: (entries: LeaderboardEntry[]) => void,
    options: { limit?: number } = {},
  ): Unsubscribe {
    const top = query(
      collection(db, this.collectionPath),
      orderBy('xp', 'desc'),
      limit(options.limit ?? this.defaultLimit),
    );
    return onSnapshot(top, (snapshot) => {
      const data = snapshot.docs.map((document) => ({
        uid: document.id,
        ...(document.data() as Omit<LeaderboardEntry, 'uid'>),
      }));
      onChange(data);
    });
  }
}

export const leaderboardRepository = new LeaderboardRepository();
