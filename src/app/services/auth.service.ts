import { Injectable } from '@angular/core';
import { Auth, user, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { UserModel } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private userSubject = new BehaviorSubject<UserModel | null>(null);
  user$: Observable<UserModel | null> = this.userSubject.asObservable();

  private _loading = new BehaviorSubject(true);
  loading$ = this._loading.asObservable();

  constructor(private auth: Auth, private firestoreService: FirestoreService, private router: Router) {
    user(this.auth).subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        const userModel = await this.mapFirebaseUserToUserModel(firebaseUser);
        this.userSubject.next(userModel);
        localStorage.setItem('user', JSON.stringify(userModel));
      } else {
        this.userSubject.next(null);
        localStorage.removeItem('user');
      }

      this._loading.next(false);
    });
  }

  get currentUser(): UserModel | null {
    return this.userSubject.value || this.getFromStorage();
  }

  setUserFromStorage(user: UserModel) {
    this.userSubject.next(user);
  }

  private getFromStorage(): UserModel | null {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  }

  async loginWithGoogle() {
    try {
      const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
      const firebaseUser = credential.user;

      const userModel = await this.mapFirebaseUserToUserModel(firebaseUser);
      this.userSubject.next(userModel);
      await this.firestoreService.checkAndSetUserRole(userModel);

      this.router.navigate(['/dashboard']);

    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  }

  async loginWithFacebook() {
    const credential = await signInWithPopup(this.auth, new FacebookAuthProvider());
    const userModel = await this.mapFirebaseUserToUserModel(credential.user);
    this.userSubject.next(userModel);
    await this.firestoreService.checkAndSetUserRole(userModel);

    this.router.navigate(['/dashboard']);
  }

  async loginWithEmail(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    const userModel = await this.mapFirebaseUserToUserModel(credential.user);
    this.userSubject.next(userModel);
    await this.firestoreService.checkAndSetUserRole(userModel);

    this.router.navigate(['/dashboard']);
  }

  async registerWithEmail(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const userModel = await this.mapFirebaseUserToUserModel(userCredential.user);
    this.userSubject.next(userModel);
    await this.firestoreService.checkAndSetUserRole(userModel);

    this.router.navigate(['/dashboard']);
  }

  async logout() {
    await signOut(this.auth);
    this.userSubject.next(null);
    setTimeout(() => {
      this.router.navigate(['/login']);
    });
  }

  private async mapFirebaseUserToUserModel(firebaseUser: User): Promise<UserModel> {
    try {
      const role = await this.firestoreService.getUserRole(firebaseUser.uid);
      const assignedUsers = await this.firestoreService.getAssignedUsers();

      return Object.assign(firebaseUser, {
        role: role || 'reader',
        assignedUsers: assignedUsers.map(user => user.uid)
      }) as UserModel;
    } catch (error) {
      console.error('Error mapping Firebase user:', error);
      return Object.assign(firebaseUser, {
        role: 'reader',
        assignedUsers: []
      }) as UserModel;
    }
  }
}
