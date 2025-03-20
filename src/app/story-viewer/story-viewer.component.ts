import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FireStoreStory } from '../models/firestore-story';
import { MatIconModule } from '@angular/material/icon';
import { StoryUtilsService } from '../services/story-utils.service';
import { BehaviorSubject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { UserModel } from '../models/user.model';

interface StorySlide {
  chapterTitle: string;
  texts: string[];
  images: string[];
  isFirstSlide: boolean;
}

@Component({
  selector: 'app-story-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './story-viewer.component.html',
  styleUrls: ['./story-viewer.component.scss']
})
export class StoryViewerComponent implements OnInit {
  @Input() story = new BehaviorSubject<FireStoreStory | null>(null);
  @Input() user: UserModel | undefined;
  storyObj: FireStoreStory | null | undefined;
  @Output() close = new EventEmitter<void>();
  @ViewChild('storyContent', { static: false }) storyContentRef!: ElementRef;

  currentPageIndex = 0;
  touchStartX = 0;
  touchEndX = 0;
  totalPages = 0; // Total number of pages including cover and last page
  chapterSlides: StorySlide[] = [];

  constructor(public storyUtils: StoryUtilsService) { }

  ngOnInit() {
    this.story.subscribe((story) => {
      this.storyObj = story;
      this.currentPageIndex = 0;
      this.chapterSlides = this.generateSlides();
      this.totalPages = this.chapterSlides.length + 2; // Cover + Slides + End Page
    });
  }

  closeStoryViewer() {
    this.close.emit();
  }

  exportToPDF() {
    if (this.storyContentRef?.nativeElement && this.storyObj) {
      this.storyUtils.exportToPDF(this.storyObj, this.storyContentRef.nativeElement);
    } else {
      console.error("storyContentRef is not yet available.");
    }
  }

  getTransformStyle(): string {
    return `translateX(-${this.currentPageIndex * 100}%)`;
  }

  nextPage() {
    if (this.currentPageIndex < this.totalPages - 1) {
      this.currentPageIndex++;
    }
  }

  previousPage() {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
    }
  }

  generateSlides(): StorySlide[] {
    if (!this.storyObj || !this.storyObj.chapters) return [];

    let slides: StorySlide[] = [];

    this.storyObj.chapters.forEach((chapter) => {
      const paragraphs = chapter.texts;
      const images = chapter.images || [];
      let firstSlide = true;

      for (let i = 0; i < paragraphs.length; i += 2) {
        let pageImages: string[] = [];

        // Del billederne op i grupper af 4 per side, men organiseret i rækker af 2
        const imageIndex = Math.floor(i / 2) * 4;
        if (images.length > imageIndex) {
          pageImages = images.slice(imageIndex, imageIndex + 4);
        }

        slides.push({
          chapterTitle: firstSlide ? chapter.title : '', // Titel kun på første slide
          texts: paragraphs.slice(i, i + 2), // Maks 2 paragraffer
          images: pageImages, // Maks 4 billeder per side (2 per række)
          isFirstSlide: firstSlide
        });

        firstSlide = false;
      }
    });

    return slides;
  }

  groupImages(images: string[], chunkSize: number): string[][] {
    const groupedImages: string[][] = [];
    for (let i = 0; i < images.length; i += chunkSize) {
      groupedImages.push(images.slice(i, i + chunkSize));
    }
    return groupedImages;
  }

  // Handle touch/swipe events for mobile
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  handleSwipe() {
    const swipeThreshold = 50; // Minimum swipe distance
    if (this.touchStartX - this.touchEndX > swipeThreshold) {
      this.nextPage();
    } else if (this.touchEndX - this.touchStartX > swipeThreshold) {
      this.previousPage();
    }
  }
}
