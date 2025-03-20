import { Injectable } from '@angular/core';
import { Auth, user, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { UserModel } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<UserModel | null>(null);
  user$: Observable<UserModel | null> = this.userSubject.asObservable();

  constructor(private auth: Auth, private firestoreService: FirestoreService) {
    user(this.auth).subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        const userModel = await this.mapFirebaseUserToUserModel(firebaseUser);
        this.userSubject.next(userModel);
      } else {
        this.userSubject.next(null);
      }
    });
  }

  async loginWithGoogle() {
    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    const userModel = await this.mapFirebaseUserToUserModel(credential.user);
    this.userSubject.next(userModel);
    await this.firestoreService.checkAndSetUserRole(userModel);
  }

  async loginWithFacebook() {
    const credential = await signInWithPopup(this.auth, new FacebookAuthProvider());
    const userModel = await this.mapFirebaseUserToUserModel(credential.user);
    this.userSubject.next(userModel);
    await this.firestoreService.checkAndSetUserRole(userModel);
  }

  async loginWithEmail(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    const userModel = await this.mapFirebaseUserToUserModel(credential.user);
    this.userSubject.next(userModel);
    await this.firestoreService.checkAndSetUserRole(userModel);
  }

  async registerWithEmail(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const userModel = await this.mapFirebaseUserToUserModel(userCredential.user);
    this.userSubject.next(userModel);
    await this.firestoreService.checkAndSetUserRole(userModel);
  }

  async logout() {
    await signOut(this.auth);
    this.userSubject.next(null);
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
