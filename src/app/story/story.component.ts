import { Component, Input, OnInit } from '@angular/core';
import { Auth, User, user } from '@angular/fire/auth';
import { AIService } from './../services/ai.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FirestoreService } from './../services/firestore.service';
import { CommonModule } from '@angular/common';
import { QuizComponent } from './../quiz/quiz.component';
import { FormsModule } from '@angular/forms';

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
    QuizComponent,
    FormsModule
  ],
	templateUrl: "story.component.html"
})

export class StoryComponent {
  @Input() user: User | undefined;
  mainCategory: string = '';
  subCategory: string = '';
  inputTopic: string = '';
  selectedGrade: number | null = null;
  story: { title: string, text: string, images: string[] }[] = [];
  quizData: any;
  quizAvailable: boolean = false;
  previousQuizResult: any;
  loading: boolean = false;


  subcategories: string[] = [];

  sportSubcategories = ['Spillere', 'Trænere', 'Klubber', 'Historiske Øjeblikke'];
  musicSubcategories = ['Kunstnere', 'Bands', 'Musikgenrer', 'Historiske Koncerter'];
  scienceSubcategories = ['Opfindelser', 'Forskere', 'Naturvidenskab', 'Teknologi'];
  historySubcategories = ['Verdenskrige', 'Berømte Personer', 'Store Opdagelser', 'Gamle Civilisationer'];
  filmSubcategories = ['Skuespillere', 'Filmgenrer', 'TV-serier', 'Kendte Instruktører', 'Film'];
  natureSubcategories = ['Klimaændringer', 'Dyr', 'Planter', 'Økosystemer'];
  spaceSubcategories = ['Planeter', 'Stjernebilleder', 'Astronauter', 'Rumrejser'];

  gradeLevels = Array.from({ length: 11 }, (_, i) => i); // 0.-10. klasse

  constructor(private aiService: AIService, private firestoreService: FirestoreService, private auth: Auth) {}

  updateSubcategories() {
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

  async generateStory() {
    if (!this.mainCategory || !this.subCategory || !this.inputTopic || this.selectedGrade === null || !this.user) return;

    this.loading = true;
    this.story = await this.aiService.generateStory(this.mainCategory, this.subCategory, this.inputTopic, this.selectedGrade);
    this.quizData = await this.aiService.generateQuiz(this.story, this.selectedGrade);
    this.quizAvailable = false;

    const savedQuizResult = await this.firestoreService.getQuizResult(this.user.uid, this.story[0].text);
    if (savedQuizResult) {
      this.previousQuizResult = savedQuizResult;
    }

    this.loading = false;
  }

  startQuiz() {
    this.quizAvailable = true;
  }

  async onQuizCompleted(result: { score: number; totalQuestions: number }) {
    if (!this.user) return;
    await this.firestoreService.saveQuizResult(this.user.uid, this.story[0].text, result.score, result.totalQuestions);
    this.previousQuizResult = result;
  }

  async saveStory() {
    if (!this.story.length || !this.user) return;
    await this.firestoreService.saveStory(this.user.uid, this.mainCategory, this.subCategory, this.inputTopic, this.story);
  }
}
