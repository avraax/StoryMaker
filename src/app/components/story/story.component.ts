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
import { ProgressTrackerComponent } from '../progress-tracker/progress-tracker.component';
import { StoryUtilsService } from '../../utils/story-utils.service';
import { BehaviorSubject } from 'rxjs';
import { UserModel } from '../../models/user.model';

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
  totalChapters = 8;
  imagesPerChapter = 6;
  wordsPerChapter = 'auto';

  story = new BehaviorSubject<FireStoreStory | null>(null);
  mainCategory: string = 'sport';
  subCategory: string = 'Spillere';
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
  lixLevels = [
    { value: 5, label: "LIX 2-5 (0. klasse)" },
    { value: 10, label: "LIX 5-10 (1. klasse)" },
    { value: 15, label: "LIX 10-15 (2. klasse)" },
    { value: 20, label: "LIX 15-20 (3. klasse)" },
    { value: 25, label: "LIX 20-25 (4. klasse)" },
    { value: 30, label: "LIX 25-30 (5. klasse)" },
    { value: 35, label: "LIX 30-35 (6. klasse)" },
    { value: 40, label: "LIX 35-40 (7. klasse)" },
    { value: 45, label: "LIX 40-45 (8.-9. klasse)" },
    { value: 50, label: "LIX 45+ (Gymnasium/voksen)" }
  ];

  wordCountMap: Record<number, number> = {
    5: 50,
    10: 100,
    15: 200,
    20: 350,
    25: 500,
    30: 700,
    35: 900,
    40: 1200,
    45: 1500,
    50: 2000
  };

  constructor(private aiService: AIService, private firestoreService: FirestoreService, public storyUtils: StoryUtilsService) { }

  async ngOnInit() {
    this.updateSubcategories(); // Opdater underkategorier baseret på den valgte hovedkategori

    this.story.subscribe((story) => {
      if (story && story.chapters && story.chapters.length > 0) {
        this.saveStory(story);
      }
    })

    await this.aiService.testLixLevels();
  }

  ngOnDestroy(): void {
    this.story.unsubscribe();
  }

  updateSubcategories() {
    if (this.mainCategory === 'other') {
      this.subcategories = [];
      this.subCategory = '';
    } else {
      const categoryMap: { [key: string]: string[] } = {
        sport: this.sportSubcategories,
        music: this.musicSubcategories,
        science: this.scienceSubcategories,
        history: this.historySubcategories,
        film: this.filmSubcategories,
        nature: this.natureSubcategories,
        space: this.spaceSubcategories,
      };
      this.subcategories = categoryMap[this.mainCategory] || [];
    }
  }

  async generateStory() {
    if (!this.inputTopic || !this.selectedLix || !this.user) {
      return;
    }

    this.cancelComplete = false;
    this.canceled = false;

    this.story.next(null);
    this.reset();

    this.totalTasks = this.totalChapters + 1;
    this.progressDescription = `Genererer kapitel 1 af ${this.totalChapters}`;
    this.loading = true;

    try {
      let coverMetadata: { description: string; image: string } | null = null;

      const wordCountPerChapter = this.getWordsPerChapter();

      for await (let data of this.aiService.generateStoryStream(this.mainCategory, this.subCategory, this.inputTopic, this.selectedLix, this.totalChapters, this.imagesPerChapter, wordCountPerChapter)) {
        if (this.canceled) {
          this.cancelComplete = true;
          this.reset();
          return;
        }

        if ('title' in data) {
          this.chapters.push(data);
          this.progressDescription = `Genererer kapitel ${this.chapters.length + 1} af ${this.totalChapters}`;
          this.progressCompletedTasks++;
        } else {
          coverMetadata = data;
        }

        if (this.progressCompletedTasks >= this.totalChapters) {
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
      return this.wordCountMap[this.selectedLix];
    }
    return Number(this.wordsPerChapter);
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
