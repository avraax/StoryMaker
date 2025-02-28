import { Component } from '@angular/core';
import { User } from '@angular/fire/auth';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoryComponent } from './story/story.component';
import { MatCardModule } from '@angular/material/card';
import { LoginComponent } from './login/login.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: "app.component.html",
  imports: [
    CommonModule,
    FormsModule,
    StoryComponent,
    MatCardModule,
    LoginComponent,
    // SavedStoriesComponent
  ],
  styleUrls: ["app.component.scss"]
})
export class AppComponent {
  user: User | null = null;
  email = '';
  password = '';
  showSavedStories = false;

  constructor(private authService: AuthService) {
    this.authService.user$.subscribe(user => this.user = user);
  }

  async logout() {
    await this.authService.logout();
  }
}
