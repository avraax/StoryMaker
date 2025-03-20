import { Component, Input, OnDestroy, OnInit } from '@angular/core';
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
import { ShareStoryDialogComponent } from '../share-story-dialog/share-story-dialog.component';
import { UserModel } from '../models/user.model';

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
  @Input() user: UserModel | undefined;
  stories: FireStoreStory[] = [];
  public selectedStory = new BehaviorSubject<FireStoreStory | null>(null);

  constructor(private firestoreService: FirestoreService, private dialog: MatDialog) { }

  ngOnInit() {
    this.loadStories();
  }

  loadStories() {
    if (this.user) {
      this.firestoreService.getStoriesForUser(this.user.uid).then(stories => {
        this.stories = stories.map(story => ({
          ...story,
          image: story.image || "",
          updatedAt: story.updatedAt instanceof Timestamp
            ? new Date(story.updatedAt.seconds * 1000)
            : story.updatedAt
        })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      });
    }
  }

  refreshStories() {
    this.loadStories();
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
      this.firestoreService.deleteStory(this.user.uid).then(() => {
        this.stories = this.stories.filter(story => story.id !== storyId);
      })
    }
  }

  public openStoryViewer(story: FireStoreStory) {
    this.selectedStory.next(story);
    this.enterFullscreen();
  }
  
  public closeStoryViewer() {
    this.selectedStory.next(null);
    this.exitFullscreen();
  }

  private enterFullscreen() {
    const elem = document.documentElement; // Use entire document as fullscreen target
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) { /* Safari */
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) { /* IE11 */
      (elem as any).msRequestFullscreen();
    }
  }
  
  private exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) { /* Safari */
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { /* IE11 */
      (document as any).msExitFullscreen();
    }
  }
  
  openShareDialog(story: FireStoreStory) {
    const dialogRef = this.dialog.open(ShareStoryDialogComponent, {
      width: '400px',
      data: { story }
    });

    dialogRef.afterClosed().subscribe(selectedUserIds => {
      if (selectedUserIds !== undefined) {
        this.firestoreService.updateStorySharing(story.id as string, selectedUserIds);
      }
    });
  }
}
