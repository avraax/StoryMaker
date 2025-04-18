import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  Renderer2
} from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
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
import { UserModel } from '../../models/user.model';
import { UserShareModel } from '../../models/user-share.model';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Story } from '../../models/story';

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
    MatProgressBarModule,
    StoryViewerComponent
  ],
  templateUrl: "generated-stories.component.html",
  styleUrls: ["generated-stories.component.scss"]
})
export class GeneratedStoriesComponent implements OnInit, OnDestroy {
  @Input() user: UserModel | undefined | null;
  stories: Story[] = [];
  displayedColumns = window.innerWidth < 768 ? ['title', 'actions'] : ['title', 'updatedAt', 'actions'];

  public selectedStory = new BehaviorSubject<Story | null>(null);
  private orientationChangeListener: (() => void) | null = null;

  constructor(
    private firestoreService: FirestoreService,
    private dialog: MatDialog,
    private renderer: Renderer2
  ) { }

  ngOnInit() {
    this.loadStories();
  }

  ngOnDestroy(): void {
    this.selectedStory.unsubscribe();
    this.removeOrientationListener();
  }

  loadStories() {
    if (this.user) {
      this.firestoreService.getStoriesForUser(this.user).then(stories => {
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
      });
    }
  }

  public async openStoryViewer(storyId: string) {
    const story = await this.firestoreService.getStoryById(storyId);
    this.selectedStory.next(story);
    this.enterFullscreen();
    this.addOrientationListener();
  }

  public closeStoryViewer() {
    this.selectedStory.next(null);
    this.exitFullscreen();
    this.removeOrientationListener();
  }

  handleReadingPageNumber(pageNumber: number) {
    const story = this.selectedStory.value;
    const email = this.user?.email;
    const safeEmail = email?.replace(/\./g, '_');

    if (story && email && safeEmail) {
      this.firestoreService.updateStoryPageNumber(story.id!, email, pageNumber);

      const storyIndex = this.stories.findIndex(s => s.id === story.id);
      if (storyIndex !== -1) {
        if (!this.stories[storyIndex].pageNumber) {
          this.stories[storyIndex].pageNumber = {};
        }

        this.stories[storyIndex].pageNumber[safeEmail] = pageNumber;
        this.stories = [...this.stories];
      }
    }
  }

  getResumePageNumber(story: Story | null): number {
    const email = this.user?.email as string;
    const safeEmail = email.replace(/\./g, '_');
    return (story?.pageNumber?.[safeEmail]) ?? 1;
  }

  public async openShareDialog(storyId: string) {
    const story = await this.firestoreService.getStoryById(storyId);
    const dialogRef = this.dialog.open(ShareStoryDialogComponent, {
      width: '400px',
      data: { story }
    });

    dialogRef.afterClosed().subscribe((assignedUsers: UserShareModel[]) => {
      if (assignedUsers !== undefined) {
        this.firestoreService.updateStorySharing(storyId, assignedUsers);
      }
    });
  }

  getStoryProgressFromPageNumber(story: Story): number {
    const email = this.user?.email as string;
    const safeEmail = email.replace(/\./g, '_');
    const pageNumber = story.pageNumber?.[safeEmail] || 0;

    const totalSlides = (story.chapters?.reduce((acc, c) => acc + Math.ceil(c.texts.length / 2), 0) || 0) + 2;

    return pageNumber / totalSlides;
  }

  /** ✅ Fullscreen & Orientation Handling */
  private async enterFullscreen() {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      await (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      await (elem as any).msRequestFullscreen();
    }

    try {
      if ('orientation' in screen && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (error) {
      this.applyCssFallback();
    }
  }

  private async exitFullscreen() {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    }

    try {
      if ('orientation' in screen && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
    } catch (error) {
      // Fail silently
    }

    this.removeCssFallback();
  }

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

  private addOrientationListener() {
    this.orientationChangeListener = () => this.applyCssFallback();
    window.matchMedia("(orientation: landscape)").addEventListener("change", this.orientationChangeListener);
  }

  private removeOrientationListener() {
    if (this.orientationChangeListener) {
      window.matchMedia("(orientation: landscape)").removeEventListener("change", this.orientationChangeListener);
      this.orientationChangeListener = null;
    }
  }
}