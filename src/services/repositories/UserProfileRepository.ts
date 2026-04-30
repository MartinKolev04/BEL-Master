import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { FirestoreService } from '../firebase/FirestoreService';
import { OperationType } from '../../errors';
import type { Grade, UserProfile } from '../../types';

export class UserProfileRepository extends FirestoreService {
  private readonly collectionPath = 'users';

  constructor() {
    super();
  }

  public async get(uid: string): Promise<UserProfile | null> {
    const path = `${this.collectionPath}/${uid}`;
    return this.run(OperationType.GET, path, async () => {
      const snapshot = await getDoc(doc(this.db, this.collectionPath, uid));
      if (!snapshot.exists()) return null;
      return snapshot.data() as UserProfile;
    });
  }

  public async create(profile: UserProfile): Promise<void> {
    const path = `${this.collectionPath}/${profile.uid}`;
    return this.run(OperationType.CREATE, path, async () => {
      await setDoc(doc(this.db, this.collectionPath, profile.uid), profile);
    });
  }

  public async setGrade(uid: string, grade: Grade): Promise<void> {
    const path = `${this.collectionPath}/${uid}`;
    return this.run(OperationType.UPDATE, path, async () => {
      await updateDoc(doc(this.db, this.collectionPath, uid), { grade });
    });
  }

  public async updateProgress(
    uid: string,
    progress: { xp: number; level: number; lastActive: string },
  ): Promise<void> {
    const path = `${this.collectionPath}/${uid}`;
    return this.run(OperationType.WRITE, path, async () => {
      await updateDoc(doc(this.db, this.collectionPath, uid), progress);
    });
  }
}

export const userProfileRepository = new UserProfileRepository();
