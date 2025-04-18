import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { StoryComponent } from '../story/story.component';
import { GeneratedStoriesComponent } from '../generated-stories/generated-stories.component';
import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTabsModule, StoryComponent, GeneratedStoriesComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  @ViewChild(GeneratedStoriesComponent) generatedStoriesComponent!: GeneratedStoriesComponent;
  user: UserModel | null = null;
  selectedTabIndex = 0;
  allowTabSwitch = true;

  constructor(private authService: AuthService) {
    this.user = this.authService.currentUser;
  }

  switchToGeneratedStories() {
    if (this.allowTabSwitch) {
      this.selectedTabIndex = 1;
      this.allowTabSwitch = false;
    }
  }

  onTabChange(index: number) {
    if (index === 1 && this.generatedStoriesComponent) {
      this.generatedStoriesComponent.refreshStories();
    }
    if (index === 0) {
      this.allowTabSwitch = true;
    }
  }

  async logout() {
    await this.authService.logout();
  }
}
