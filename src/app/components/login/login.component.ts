import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule, MatTabsModule, MatIconModule],
  templateUrl: "login.component.html",
  styleUrls: ["login.component.scss"]
})
export class LoginComponent {
  loginEmail = '';
  loginPassword = '';
  registerEmail = '';
  registerPassword = '';
  confirmPassword = '';
  hideLoginPassword = true;
  hideRegisterPassword = true;
  hideConfirmPassword = true;
  enableEmailLogin = environment.enableEmailLogin;

  loginError: string | null = null;
  registerError: string | null = null;
  hidePassword = true; // Password visibility toggle

  constructor(private authService: AuthService, private router: Router) {
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      this.router.navigate(['/dashboard']);
    }
  }

  async loginWithGoogle() {
    this.clearErrors();
    try {
      await this.authService.loginWithGoogle();
    } catch (error: any) {
      this.loginError = this.mapFirebaseError(error.code || error.message);
    }
  }

  async loginWithFacebook() {
    this.clearErrors();
    try {
      await this.authService.loginWithFacebook();
    } catch (error: any) {
      this.loginError = this.mapFirebaseError(error.code || error.message);
    }
  }

  async loginWithEmail(form: NgForm) {
    if (!form.valid) return;

    this.clearErrors();
    try {
      await this.authService.loginWithEmail(this.loginEmail, this.loginPassword);
    } catch (error: any) {
      this.loginError = this.mapFirebaseError(error.code || error.message);
    }
  }

  async registerWithEmail(form: NgForm) {
    if (!form.valid || this.registerPassword !== this.confirmPassword) {
      this.registerError = "Adgangskoderne matcher ikke.";
      return;
    }

    this.clearErrors();
    try {
      await this.authService.registerWithEmail(this.registerEmail, this.registerPassword);
    } catch (error: any) {
      this.registerError = this.mapFirebaseError(error.code || error.message);
    }
  }

  passwordsMatch(form: NgForm): boolean {
    if (!form.controls['confirmPassword'] ||
      !form.controls['registerPassword']) {
      return true;
    }

    const confirmPassword = form.controls['confirmPassword'].value;
    const registerPassword = form.controls['registerPassword'].value;
    if (confirmPassword.length < 6 || registerPassword.length < 6) {
      return true;
    }

      return confirmPassword === registerPassword;
  }

  private clearErrors() {
    this.loginError = null;
    this.registerError = null;
  }

  private mapFirebaseError(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Denne e-mail er allerede registreret.';
      case 'auth/invalid-email':
        return 'E-mailen er ikke gyldig.';
      case 'auth/user-disabled':
        return 'Denne konto er deaktiveret.';
      case 'auth/user-not-found':
        return 'Bruger ikke fundet. Tjek din e-mail.';
      case 'auth/wrong-password':
        return 'Forkert adgangskode.';
      case 'auth/weak-password':
        return 'Adgangskoden skal være mindst 6 tegn.';
      case 'auth/popup-closed-by-user':
        return 'Google login blev annulleret.';
      default:
        return 'Der opstod en fejl. Prøv igen.';
    }
  }
}
