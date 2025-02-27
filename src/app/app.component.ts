import { Component } from '@angular/core';
import { User } from '@angular/fire/auth';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoryComponent } from './story/story.component';
import { MatCardModule } from '@angular/material/card';
import { LoginComponent } from './login/login.component';
import { SavedStoriesComponent } from './saved-stories/saved-stories.component';

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
    SavedStoriesComponent
  ],
  styles: [`
    .auth-container {
      text-align: center;
      margin-bottom: 20px;
    }
    .profile-container {
      text-align: center;
    }
    .profile-pic {
      width: 100px;
      border-radius: 50%;
    }
    input {
      display: block;
      margin: 10px auto;
      padding: 8px;
    }
    button {
      margin: 5px;
    }
  `]
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
