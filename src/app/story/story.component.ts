import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Auth, User, user } from '@angular/fire/auth';
import { AIService } from './../services/ai.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { QuizComponent } from './../quiz/quiz.component';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
    MatIconModule,
    QuizComponent,
    FormsModule
  ],
  templateUrl: "story.component.html",
  styleUrls: ["story.component.scss"]
})

export class StoryComponent {
  @ViewChild('storyContentContainer', { static: false }) storyContentRef!: ElementRef;
  @Input() user: User | undefined;
  mainCategory: string = 'sport';
  subCategory: string = 'Spillere';
  inputTopic: string = '';
  selectedGrade: number = 4;
  story: { title: string, texts: string[], images: string[], imageQuery: string }[] = [];
  quizData: any;
  quizAvailable: boolean = false;
  previousQuizResult: any;
  loading: boolean = false;
  isFullscreen = false;


  subcategories: string[] = [];

  sportSubcategories = ['Spillere', 'Trænere', 'Klubber', 'Historiske Øjeblikke'];
  musicSubcategories = ['Kunstnere', 'Bands', 'Musikgenrer', 'Historiske Koncerter'];
  scienceSubcategories = ['Opfindelser', 'Forskere', 'Naturvidenskab', 'Teknologi'];
  historySubcategories = ['Verdenskrige', 'Berømte Personer', 'Store Opdagelser', 'Gamle Civilisationer'];
  filmSubcategories = ['Skuespillere', 'Filmgenrer', 'TV-serier', 'Kendte Instruktører', 'Film'];
  natureSubcategories = ['Klimaændringer', 'Dyr', 'Planter', 'Økosystemer'];
  spaceSubcategories = ['Planeter', 'Stjernebilleder', 'Astronauter', 'Rumrejser'];

  gradeLevels = Array.from({ length: 11 }, (_, i) => i); // 0.-10. klasse

  constructor(private aiService: AIService, private auth: Auth) { }

  ngOnInit() {
    this.updateSubcategories(); // Opdater underkategorier baseret på den valgte hovedkategori
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

    this.loading = true;
    this.story = await this.aiService.generateStory(this.mainCategory, this.subCategory, this.inputTopic, this.selectedGrade);

    this.loading = false;
  }

  async startQuiz() {
    // this.quizData = await this.aiService.generateQuiz(this.story, this.selectedGrade);

    // var currentUser = this.auth.currentUser as User;
    // const savedQuizResult = await this.firestoreService.getQuizResult(currentUser.uid, this.story[0].texts);
    // if (savedQuizResult) {
    //   this.previousQuizResult = savedQuizResult;
    // }
    this.quizAvailable = true;
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      document.body.style.overflow = 'hidden'; // Disable page scrolling
    } else {
      document.body.style.overflow = ''; // Restore default scrolling
    }
  }

  async onQuizCompleted(result: { score: number; totalQuestions: number }) {
    // if (!this.user) return;
    // await this.firestoreService.saveQuizResult(this.user.uid, this.story[0].texts, result.score, result.totalQuestions);
    // this.previousQuizResult = result;
  }

  exportToPDF() {
    const margin = 10; // Side margins in mm
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait mode

    const chapters = this.storyContentRef.nativeElement.querySelectorAll('.chapter-container');

    if (!chapters.length) {
      console.error("No chapters found for export!");
      return;
    }

    let isFirstPage = true;

    const processChapter = async (index: number) => {
      if (index >= chapters.length) {
        doc.save('story.pdf');
        return;
      }

      const chapter = chapters[index] as HTMLElement;

      try {
        const canvas = await html2canvas(chapter, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin; // Adjust width for margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width; // Maintain aspect ratio

        if (!isFirstPage) {
          doc.addPage(); // Add a new page for each chapter
        }

        doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);

        isFirstPage = false; // Ensure new pages are added after the first

        await processChapter(index + 1); // Process the next chapter recursively
      } catch (error) {
        console.error("Error processing chapter:", error);
      }
    };

    processChapter(0); // Start processing chapters
  }

  groupImages(images: string[], chunkSize: number): string[][] {
    const groupedImages: string[][] = [];
    for (let i = 0; i < images.length; i += chunkSize) {
      groupedImages.push(images.slice(i, i + chunkSize));
    }
    return groupedImages;
  }
}
