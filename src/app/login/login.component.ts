import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule],
  templateUrl: "login.component.html",
  styleUrls: ["login.component.scss"]
})
export class LoginComponent {
  email = '';
  password = '';
  enableEmailLogin = environment.enableEmailLogin;

  constructor(private authService: AuthService) {}

  async loginWithGoogle() {
    await this.authService.loginWithGoogle();
  }

  async loginWithFacebook() {
    await this.authService.loginWithFacebook();
  }

  async loginWithEmail() {
    await this.authService.loginWithEmail(this.email, this.password);
  }

  async registerWithEmail() {
    await this.authService.registerWithEmail(this.email, this.password);
  }
}
