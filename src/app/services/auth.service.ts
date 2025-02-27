import { Injectable } from '@angular/core';
import { Auth, User, user, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, signOut, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private auth: Auth) {
    user(this.auth).subscribe((u) => {
      this.userSubject.next(u);
    });
  }

  async loginWithGoogle() {
    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    this.userSubject.next(credential.user);
  }

  async loginWithFacebook() {
    const credential = await signInWithPopup(this.auth, new FacebookAuthProvider());
    this.userSubject.next(credential.user);
  }

  async loginWithEmail(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    this.userSubject.next(credential.user);
  }

  async registerWithEmail(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    // await updateProfile(userCredential.user);
    this.userSubject.next(userCredential.user);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  async logout() {
    await signOut(this.auth);
    this.userSubject.next(null);
  }
}
