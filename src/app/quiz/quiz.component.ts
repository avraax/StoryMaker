import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatRadioModule,
    FormsModule
  ],
	templateUrl: "quiz.component.html",
  styleUrls: ["quiz.component.scss"]
})
export class QuizComponent {
  @Input() quiz: any;
  @Output() quizCompleted = new EventEmitter<{ score: number; totalQuestions: number }>();

  userAnswers: string[] = [];
  isQuizCompleted: boolean = false;
  correctAnswers: number = 0;

  submitQuiz() {
    this.correctAnswers = this.quiz.questions.filter((q: any, i: number) => q.correctAnswer === this.userAnswers[i]).length;
    this.isQuizCompleted = true;
    this.quizCompleted.emit();
  }
}
