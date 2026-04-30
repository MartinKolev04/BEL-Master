import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { FirestoreService } from '../firebase/FirestoreService';
import { OperationType } from '../../errors';

export class LobbyRepository extends FirestoreService {
  private readonly collectionPath = 'lobbies';

  constructor() {
    super();
  }

  public async create(id: string, lobby: Record<string, unknown>): Promise<void> {
    const path = `${this.collectionPath}/${id}`;
    return this.run(OperationType.CREATE, path, async () => {
      await setDoc(doc(this.db, this.collectionPath, id), {
        ...lobby,
        createdAt: serverTimestamp(),
      });
    });
  }

  public async fetch(id: string): Promise<Record<string, any> | null> {
    const path = `${this.collectionPath}/${id}`;
    return this.run(OperationType.GET, path, async () => {
      const snapshot = await getDoc(doc(this.db, this.collectionPath, id));
      return snapshot.exists() ? (snapshot.data() as Record<string, any>) : null;
    });
  }

  public async update(id: string, patch: Record<string, unknown>): Promise<void> {
    const path = `${this.collectionPath}/${id}`;
    return this.run(OperationType.UPDATE, path, async () => {
      await updateDoc(doc(this.db, this.collectionPath, id), patch as any);
    });
  }

  public observe(
    id: string,
    onChange: (lobby: Record<string, any> | null) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(this.db, this.collectionPath, id),
      (snapshot) => onChange(snapshot.exists() ? (snapshot.data() as Record<string, any>) : null),
      onError,
    );
  }

  public async claimRoundIfQuestionActive(
    id: string,
    userUid: string,
    scoreIncrement: number,
  ): Promise<void> {
    const path = `${this.collectionPath}/${id}`;
    return this.run(OperationType.UPDATE, path, async () => {
      await runTransaction(this.db, async (transaction) => {
        const lobbyRef = doc(this.db, this.collectionPath, id);
        const snapshot = await transaction.get(lobbyRef);
        if (!snapshot.exists()) return;
        const data = snapshot.data() as any;
        if (data.roundStatus === 'question') {
          transaction.update(lobbyRef, {
            winnerId: userUid,
            roundStatus: 'picking',
            [`players.${userUid}.score`]: (data.players[userUid]?.score || 0) + scoreIncrement,
          });
        }
      });
    });
  }
}

export const lobbyRepository = new LobbyRepository();
