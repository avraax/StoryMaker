import { Component } from '@angular/core';
import { User } from '@angular/fire/auth';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoryComponent } from './story/story.component';
import { GeneratedStoriesComponent } from './generated-stories/generated-stories.component';
import { MatCardModule } from '@angular/material/card';
import { LoginComponent } from './login/login.component';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: "app.component.html",
  imports: [
    CommonModule,
    FormsModule,
    StoryComponent,
    GeneratedStoriesComponent,
    MatCardModule,
    LoginComponent,
    MatTabsModule
  ],
  styleUrls: ["app.component.scss"]
})
export class AppComponent {
  user: User | null = null;
  email = '';
  password = '';
  showSavedStories = false;
  selectedTabIndex = 0;
  allowTabSwitch = true;

  constructor(private authService: AuthService) {
    this.authService.user$.subscribe(user => this.user = user);
  }

  switchToGeneratedStories() {
    if (this.allowTabSwitch) {
      this.selectedTabIndex = 1;
      this.allowTabSwitch = false;
    }
  }

  onTabChange(index: number) {
    if (index === 0) {
      this.allowTabSwitch = true;
    }
  }

  async logout() {
    await this.authService.logout();
  }
}
