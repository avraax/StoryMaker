import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { User } from '@angular/fire/auth';
import { AIService } from './../services/ai.service';
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
import { FirestoreService } from '../services/firestore.service';
import { StoryChapter } from '../models/story-chapter';
import { FireStoreStory } from '../models/firestore-story';
import { ProgressTrackerComponent } from '../progress-tracker/progress-tracker.component';
import { StoryUtilsService } from '../services/story-utils.service';
import { StoryViewerComponent } from '../story-viewer/story-viewer.component';
import { BehaviorSubject } from 'rxjs';

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
    FormsModule,
    StoryViewerComponent
  ],
  templateUrl: "story.component.html",
  styleUrls: ["story.component.scss"]
})

export class StoryComponent implements OnInit, OnDestroy {
  @Output() navigateToGenerated = new EventEmitter<void>(); // Opret event
  @Input() user: User | undefined;
  generatedStory = new BehaviorSubject<FireStoreStory | null>(null);
  mainCategory: string = 'sport';
  subCategory: string = 'Spillere';
  inputTopic: string = '';
  selectedGrade: number = 4;
  chapters: StoryChapter[] = [];
  loading: boolean = false;
  showStoryViewer: boolean = false;

  generatedChapters: number = 0;
  totalChapters: number = 0;
  progressDescription: string | null = null;
  progressCompletedTasks: number = 0;

  subcategories: string[] = [];
  sportSubcategories = ['Spillere', 'Trænere', 'Klubber', 'Historiske Øjeblikke'];
  musicSubcategories = ['Kunstnere', 'Bands', 'Musikgenrer', 'Historiske Koncerter'];
  scienceSubcategories = ['Opfindelser', 'Forskere', 'Naturvidenskab', 'Teknologi'];
  historySubcategories = ['Verdenskrige', 'Berømte Personer', 'Store Opdagelser', 'Gamle Civilisationer'];
  filmSubcategories = ['Skuespillere', 'Filmgenrer', 'TV-serier', 'Kendte Instruktører', 'Film'];
  natureSubcategories = ['Klimaændringer', 'Dyr', 'Planter', 'Økosystemer'];
  spaceSubcategories = ['Planeter', 'Stjernebilleder', 'Astronauter', 'Rumrejser'];

  gradeLevels = Array.from({ length: 11 }, (_, i) => i); // 0.-10. klasse

  constructor(private aiService: AIService, private firestoreService: FirestoreService, public storyUtils: StoryUtilsService) { }

  ngOnInit() {
    this.updateSubcategories(); // Opdater underkategorier baseret på den valgte hovedkategori

    this.generatedStory.subscribe((story) => {
      if (story && story.chapters && story.chapters.length > 0) {
        this.saveGeneratedStory(story);
      }
    })
  }

  ngOnDestroy(): void {
    this.generatedStory.unsubscribe();
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
    if (!this.inputTopic || !this.selectedGrade) {
      return;
    }
    this.generatedStory.next(null);
    this.progressCompletedTasks = 0;
    this.chapters = [];
    this.generatedChapters = 0;
    this.loading = true;
    this.totalChapters = await this.aiService.getTotalChapters();

    this.progressDescription = `genererer kapitler`;
    // Using async generator method
    for await (let chapter of this.aiService.generateStoryStream(this.mainCategory, this.subCategory, this.inputTopic, this.selectedGrade)) {
      this.chapters.push(chapter); // Update story dynamically
      this.generatedChapters++; // Update progress bar
      this.progressCompletedTasks++;

      if (this.generatedChapters >= this.progressCompletedTasks) {
        this.progressDescription = `gemmer genereret histore`;
      }
    }

    this.generatedStory.next({
      title: this.inputTopic,
      chapters: this.chapters,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.progressCompletedTasks++;
    this.loading = false;
  }

  public openStoryViewer() {
    this.showStoryViewer = true;
  }

  closeStoryViewer() {
    this.showStoryViewer = false;
  }

  async saveGeneratedStory(story: FireStoreStory | undefined | null) {
    if (!this.user || !story) return;

    try {
      await this.firestoreService.saveGeneratedStory(this.user.uid, story);
    } catch (error) {
      console.error("Error saving story:", error);
    }
  }
}
