import { Component, Input } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { FirestoreService } from '../services/firestore.service';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-saved-stories',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
  ],
  templateUrl: "saved-stories.component.html",
  styleUrls: ["saved-stories.component.scss"]
})
export class SavedStoriesComponent {
  @Input() user: User | undefined;
  savedStories: any[] = [];

  constructor(private firestoreService: FirestoreService, private auth: Auth) {}

  async deleteStory(storyId: string) {
    if (this.user) {
      await this.firestoreService.deleteUserStory(this.user.uid, storyId);
      this.savedStories = this.savedStories.filter(story => story.id !== storyId);
    }
  }
}
