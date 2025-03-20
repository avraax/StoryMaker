import { Component, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
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
  private orientationChangeListener: (() => void) | null = null;

  constructor(private firestoreService: FirestoreService, private dialog: MatDialog,
    private renderer: Renderer2) { }

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
    this.removeOrientationListener();
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
      this.firestoreService.deleteStory(storyId).then(() => {
        this.stories = this.stories.filter(story => story.id !== storyId);
      })
    }
  }

  public openStoryViewer(story: FireStoreStory) {
    this.selectedStory.next(story);
    this.enterFullscreen();
    this.addOrientationListener(); // ✅ Start monitoring screen rotation
  }

  public closeStoryViewer() {
    this.selectedStory.next(null);
    this.exitFullscreen();
    this.removeOrientationListener(); // ✅ Stop monitoring screen rotation
  }

  private async enterFullscreen() {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) { /* Safari */
      await (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) { /* IE11 */
      await (elem as any).msRequestFullscreen();
    }

    try {
      if ('orientation' in screen && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
        console.log("Orientation locked to landscape");
      } else {
        throw new Error("Orientation lock not supported");
      }
    } catch (error) {
      console.warn("Could not lock orientation, checking if CSS fallback is needed:", error);
      this.applyCssFallback();
    }
  }

  private async exitFullscreen() {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) { /* Safari */
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { /* IE11 */
      await (document as any).msExitFullscreen();
    }

    try {
      if ('orientation' in screen && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
    } catch (error) {
      console.warn("Could not unlock orientation:", error);
    }

    this.removeCssFallback();
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

  /** ✅ Detect screen orientation & apply/remove CSS */
  private applyCssFallback() {
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    const fullscreenContainer = document.querySelector('.fullscreen-view-container');

    if (!isLandscape && fullscreenContainer) {
      this.renderer.addClass(fullscreenContainer, 'rotate-landscape');
    } else if (isLandscape && fullscreenContainer) {
      this.renderer.removeClass(fullscreenContainer, 'rotate-landscape');
    }
  }

  private removeCssFallback() {
    const fullscreenContainer = document.querySelector('.fullscreen-view-container');
    if (fullscreenContainer) {
      this.renderer.removeClass(fullscreenContainer, 'rotate-landscape');
    }
  }

  /** ✅ Add listener for screen rotation */
  private addOrientationListener() {
    this.orientationChangeListener = () => this.applyCssFallback();
    window.matchMedia("(orientation: landscape)").addEventListener("change", this.orientationChangeListener);
  }

  /** ✅ Remove listener when fullscreen is closed */
  private removeOrientationListener() {
    if (this.orientationChangeListener) {
      window.matchMedia("(orientation: landscape)").removeEventListener("change", this.orientationChangeListener);
      this.orientationChangeListener = null;
    }
  }
}
