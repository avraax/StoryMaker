import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AIService } from '../../services/ai.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../services/firestore.service';
import { StoryChapter } from '../../models/story-chapter';
import { FireStoreStory } from '../../models/firestore-story';
import { StoryUtilsService } from '../../utils/story-utils.service';
import { BehaviorSubject } from 'rxjs';
import { UserModel } from '../../models/user.model';
import { LixService } from '../../services/lix.service';
import { ProgressTrackerComponent } from '../progress-tracker/progress-tracker.component';

@Component({
  selector: 'app-story',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatIconModule,
    ProgressTrackerComponent,
    FormsModule
  ],
  templateUrl: "story.component.html",
  styleUrls: ["story.component.scss"],
})

export class StoryComponent implements OnInit, OnDestroy {
  @Output() navigateToGenerated = new EventEmitter<void>();
  @Input() user: UserModel | undefined | null;

  advancedOpen = false;
  imagesPerChapter = 'auto';
  numberOfChapter = 'auto';
  wordsPerChapter = 'auto';

  story = new BehaviorSubject<FireStoreStory | null>(null);
  inputTopic: string = '';
  chapters: StoryChapter[] = [];
  loading: boolean = false;
  totalTasks: number = 0;
  progressDescription: string | null = null;
  progressCompletedTasks: number = 0;
  canceled: boolean = false;
  cancelComplete: boolean = false;

  subcategories: string[] = [];
  sportSubcategories = ['Spillere', 'Trænere', 'Klubber', 'Historiske Øjeblikke'];
  musicSubcategories = ['Kunstnere', 'Bands', 'Musikgenrer', 'Historiske Koncerter'];
  scienceSubcategories = ['Opfindelser', 'Forskere', 'Naturvidenskab', 'Teknologi'];
  historySubcategories = ['Verdenskrige', 'Berømte Personer', 'Store Opdagelser', 'Gamle Civilisationer'];
  filmSubcategories = ['Skuespillere', 'Filmgenrer', 'TV-serier', 'Kendte Instruktører', 'Film'];
  natureSubcategories = ['Klimaændringer', 'Dyr', 'Planter', 'Økosystemer'];
  spaceSubcategories = ['Planeter', 'Stjernebilleder', 'Astronauter', 'Rumrejser'];

  selectedLix: number = 25;

  constructor(private aiService: AIService,
    public lixService: LixService,
    private firestoreService: FirestoreService,
    public storyUtils: StoryUtilsService) {
    // this.aiService.testLixLevels();
  }

  async ngOnInit() {
    this.story.subscribe((story) => {
      if (story && story.chapters && story.chapters.length > 0) {
        this.saveStory(story);
      }
    })
  }

  ngOnDestroy(): void {
    this.story.unsubscribe();
  }

  async generateStory() {
    if (!this.inputTopic || !this.selectedLix || !this.user) {
      return;
    }

    this.cancelComplete = false;
    this.canceled = false;

    this.story.next(null);
    this.reset();

    const imagesPerChapterVaue = this.getImagesPerChapter();
    const numberOfChaptersValue = this.getChapters();
    if (this.numberOfChapter === 'auto') {
      const selectedLix = this.lixService.lixLevels.find(level => level.level === this.selectedLix);
      this.totalTasks = selectedLix?.chapters as number + 1;
    }
    else {
      this.totalTasks = numberOfChaptersValue + 1;
    }

    this.progressDescription = `Genererer kapitel 1 af ${numberOfChaptersValue}`;
    this.loading = true;

    try {
      let coverMetadata: { description: string; image: string } | null = null;

      const wordCountPerChapter = this.getWordsPerChapter();

      for await (let data of this.aiService.generateStoryStream(this.inputTopic, this.selectedLix, numberOfChaptersValue, imagesPerChapterVaue, wordCountPerChapter)) {
        if (this.canceled) {
          this.cancelComplete = true;
          this.reset();
          return;
        }

        if ('title' in data) {
          this.chapters.push(data);
          this.progressDescription = `Genererer kapitel ${this.chapters.length + 1} af ${numberOfChaptersValue}`;
          this.progressCompletedTasks++;
        } else {
          coverMetadata = data;
        }

        if (this.progressCompletedTasks >= numberOfChaptersValue) {
          this.progressDescription = `Gemmer historie`;
        }
      }

      if (this.canceled) return;

      if (!coverMetadata) {
        throw new Error("Metadata mangler. Kunne ikke generere beskrivelse og forsidebillede.");
      }

      const date = new Date();

      this.story.next({
        title: this.inputTopic,
        chapters: this.chapters,
        author: 'ChatGPT',
        description: coverMetadata.description,
        image: coverMetadata.image,
        createdAt: date,
        updatedAt: date,
        lix: this.selectedLix,
        createdBy: this.user.uid,
        sharedWith: []
      });

    } catch (error) {
      this.cancelComplete = true;
      this.reset();
      console.error(error);
    }

    this.progressCompletedTasks++;
    this.loading = false; // ✅ End of progress
  }

  toggleAdvanced() {
    this.advancedOpen = !this.advancedOpen;
  }

  getWordsPerChapter(): number {
    if (this.wordsPerChapter === 'auto') {
      return this.lixService.getLixModelByLevel(this.selectedLix)?.wordsPerChapter || 150;
    }
    return Number(this.wordsPerChapter);
  }

  getChapters(): number {
    if (this.numberOfChapter === 'auto') {
      return this.lixService.getLixModelByLevel(this.selectedLix)?.chapters || 3;
    }
    return Number(this.numberOfChapter);
  }

  getImagesPerChapter(): number {
    if (this.imagesPerChapter === 'auto') {
      return this.lixService.getLixModelByLevel(this.selectedLix)?.imagesPerChapter || 2;
    }
    return Number(this.imagesPerChapter);
  }

  cancelGeneration() {
    this.canceled = true;
    this.progressDescription = 'Afbryder...';
  }

  private reset(): void {
    this.story.next(null);
    this.chapters = [];
    this.progressCompletedTasks = 0;
    this.progressDescription = '';
    this.totalTasks = 0;
    this.loading = false;
    this.canceled = false;
  }

  async saveStory(story: FireStoreStory | undefined | null) {
    if (!this.user || !story) return;

    try {
      await this.firestoreService.saveStory(this.user.uid, story);
    } catch (error) {
      console.error("Error saving story:", error);
    }
  }
}
