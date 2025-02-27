import { Component, Input } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { FirestoreService } from '../services/firestore.service';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog';
import { StoryDialogComponent } from '../story-dialog/story-dialog.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-saved-stories',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatDialogModule
  ],
  templateUrl: "saved-stories.component.html",
  styles: [` 
    .container {
      max-width: 600px;
      margin: auto;
      padding: 20px;
      text-align: center;
    }
    .chapter-image {
      max-width: 100%;
      margin-top: 10px;
      border-radius: 8px;
    }
  `]
})
export class SavedStoriesComponent {
  @Input() user: User | undefined;
  savedStories: any[] = [];

  constructor(private firestoreService: FirestoreService, private auth: Auth, private dialog: MatDialog) {}

  openStoryDialog(story: any) {
    this.dialog.open(StoryDialogComponent, {
      width: '600px',
      data: { story }
    });
  }

  async deleteStory(storyId: string) {
    if (this.user) {
      await this.firestoreService.deleteUserStory(this.user.uid, storyId);
      this.savedStories = this.savedStories.filter(story => story.id !== storyId);
    }
  }
}
