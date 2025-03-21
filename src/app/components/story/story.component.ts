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
import { StoryViewerComponent } from '../story-viewer/story-viewer.component';
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
    FormsModule,
    StoryViewerComponent
  ],
  templateUrl: "story.component.html",
  styleUrls: ["story.component.scss"],
})

export class StoryComponent implements OnInit, OnDestroy {
  @Output() navigateToGenerated = new EventEmitter<void>(); // Opret event
  @Input() user: UserModel | undefined | null;
  story = new BehaviorSubject<FireStoreStory | null>(null);
  mainCategory: string = 'sport';
  subCategory: string = 'Spillere';
  inputTopic: string = '';
  selectedGrade: number = 4;
  chapters: StoryChapter[] = [];
  loading: boolean = false;
  showStoryViewer: boolean = false;
  totalChapters: number = 0;
  totalTasks: number = 0;
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

  selectedLix: number = 20;
  lixLevels = [
    { value: 3, label: "LIX 3-5 (0. kl.)" },
    { value: 5, label: "LIX 4-6 (0.-1. kl.)" },
    { value: 7, label: "LIX 5-7 (1. kl.)" },
    { value: 9, label: "LIX 6-8 (2. kl.)" },
    { value: 11, label: "LIX 7-9 (2.-3. kl.)" },
    { value: 13, label: "LIX 9-11 (3.-4. kl.)" },
    { value: 15, label: "LIX 11-13 (4.-5. kl.)" },
    { value: 20, label: "LIX 15-20 (5.-6. kl.)" },
    { value: 25, label: "LIX 20-25 (6.-7. kl.)" },
    { value: 30, label: "LIX 25-30 (7.-8. kl.)" },
    { value: 35, label: "LIX 30-35 (8.-9. kl.)" },
    { value: 40, label: "LIX 35-40 (9. kl.)" },
    { value: 45, label: "LIX >40 (Gymnasium/voksen)" }
  ];
  constructor(private aiService: AIService, private firestoreService: FirestoreService, public storyUtils: StoryUtilsService) { }

  ngOnInit() {
    this.updateSubcategories(); // Opdater underkategorier baseret på den valgte hovedkategori

    this.story.subscribe((story) => {
      if (story && story.chapters && story.chapters.length > 0) {
        this.saveStory(story);
      }
    })
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

    this.story.next(null);
    this.reset();
    this.totalChapters = this.aiService.totalChapters;
    this.totalTasks = this.totalChapters + 1;
    this.progressDescription = `Genererer kapitel ${(this.chapters.length + 1)} af ${this.totalChapters}`;

    try {
      let coverMetadata: { description: string; image: string } | null = null;

      for await (let data of this.aiService.generateStoryStream(this.mainCategory, this.subCategory, this.inputTopic, this.selectedLix)) {
        if ('title' in data) {
          this.chapters.push(data);

          if (this.chapters.length < this.totalChapters) {
            this.progressDescription = `Genererer kapitel ${(this.chapters.length + 1)} af ${this.totalChapters}`;
          }

          this.progressCompletedTasks++;
        } else {
          coverMetadata = data;
        }

        if (this.progressCompletedTasks >= this.totalChapters) {
          this.progressDescription = `Gemmer historie`;
        }
      }

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
      this.reset();
      throw error;
    }

    this.progressCompletedTasks++;
    this.loading = false;
  }


  private reset(): void {
    this.story.next(null);
    this.progressCompletedTasks = 0;
    this.progressDescription = '';
    this.chapters = [];
    this.loading = true;
  }

  public openStoryViewer() {
    this.showStoryViewer = true;
  }

  closeStoryViewer() {
    this.showStoryViewer = false;
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
