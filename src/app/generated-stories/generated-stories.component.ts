import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { FirestoreService } from '../services/firestore.service';
import { FireStoreStory } from '../models/firestore-story';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { StoryViewerComponent } from '../story-viewer/story-viewer.component';
import { BehaviorSubject } from 'rxjs';
import { Timestamp } from 'firebase/firestore';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DeleteConfirmationDialogComponent } from '../delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-generated-stories',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    StoryViewerComponent
  ],
  templateUrl: "generated-stories.component.html",
  styleUrls: ["generated-stories.component.scss"]
})
export class GeneratedStoriesComponent implements OnInit, OnDestroy {
  @Input() user: User | undefined;
  stories: FireStoreStory[] = [];
  public selectedStory = new BehaviorSubject<FireStoreStory | null>(null);

  constructor(private firestoreService: FirestoreService, private dialog: MatDialog) { }

  ngOnInit() {
    if (this.user) {
      this.firestoreService.getStories(this.user.uid).subscribe(stories => {
        this.stories = stories.map(story => ({
          ...story,
          updatedAt: story.updatedAt instanceof Timestamp
            ? new Date(story.updatedAt.seconds * 1000) // Convert Firestore Timestamp to JavaScript Date
            : story.updatedAt // Keep it as Date if already converted
        })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Sort by date descending
      });
    }
  }

  ngOnDestroy(): void {
    this.selectedStory.unsubscribe();
  }

  confirmDelete(storyId: string, storyTitle: string): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '350px',
      data: { storyTitle }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteStory(storyId);
      }
    });
  }

  async deleteStory(storyId: string | undefined) {
    if (this.user && storyId) {
      await this.firestoreService.deleteStory(this.user.uid, storyId);
      this.stories = this.stories.filter(story => story.id !== storyId);
    }
  }

  public openStoryViewer(story: FireStoreStory) {
    this.selectedStory.next(story);
  }

  closeStoryViewer() {
    this.selectedStory.next(null);
  }
}
