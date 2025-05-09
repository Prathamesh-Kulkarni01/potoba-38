import type { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'admin' | 'user';

export interface AuthUser extends FirebaseUser {
  role?: UserRole;
}
