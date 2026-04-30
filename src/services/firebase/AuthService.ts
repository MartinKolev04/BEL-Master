import {
  type Auth,
  type User,
  type Unsubscribe,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { auth as defaultAuth } from './firebaseClient';
import { AuthError } from '../../errors';

export interface AuthCredentials {
  email: string;
  password: string;
}

export class AuthService {
  private readonly auth: Auth;

  constructor(authInstance: Auth = defaultAuth) {
    this.auth = authInstance;
  }

  public get currentUser(): User | null {
    return this.auth.currentUser;
  }

  public observe(callback: (user: User | null) => void): Unsubscribe {
    return onAuthStateChanged(this.auth, callback);
  }

  public async signInWithEmail({ email, password }: AuthCredentials): Promise<User> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return credential.user;
    } catch (cause) {
      throw new AuthError(this.toMessage(cause), cause);
    }
  }

  public async registerWithEmail({ email, password }: AuthCredentials): Promise<User> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      return credential.user;
    } catch (cause) {
      throw new AuthError(this.toMessage(cause), cause);
    }
  }

  public async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (cause) {
      throw new AuthError(this.toMessage(cause), cause);
    }
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new AuthError('No authenticated user with email available.');
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    } catch (cause) {
      throw new AuthError(this.toMessage(cause), cause);
    }
  }

  private toMessage(cause: unknown): string {
    if (cause instanceof Error) return cause.message;
    return String(cause);
  }
}

export const authService = new AuthService();
