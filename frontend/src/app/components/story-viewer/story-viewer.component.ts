import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { StoryUtilsService } from '../../utils/story-utils.service';
import { BehaviorSubject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { UserModel } from '../../models/user.model';
import { Story } from '../../models/story';
import { WakeLockService } from '../../services/wake-lock.service';

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
export class StoryViewerComponent implements OnInit, OnDestroy {
  @Input() story = new BehaviorSubject<Story | null>(null);
  @Input() user: UserModel | undefined | null;
  storyObj: Story | null | undefined;
  @Output() close = new EventEmitter<void>();
  @Output() readingPageNumber = new EventEmitter<number>();
  @Input() startAtPage: number = 1;
  @ViewChild('storyContent', { static: false }) storyContentRef!: ElementRef;

  currentPageIndex = 1;
  touchStartX = 0;
  touchEndX = 0;
  totalPages = 0; // Total number of pages including cover and last page
  chapterSlides: StorySlide[] = [];

  constructor(public storyUtils: StoryUtilsService, private wakeLockService: WakeLockService) { }

  ngOnInit(): void {
    this.wakeLockService.enableWakeLock();
    
    this.story.subscribe((story) => {
      this.storyObj = story;
      this.chapterSlides = this.generateSlides();
      this.totalPages = this.chapterSlides.length + 2; // Cover + Chapters + End page

      // ✅ Start at stored progress (or 0)
      this.currentPageIndex = this.startAtPage - 1;
    });
  }

  ngOnDestroy(): void {
    this.wakeLockService.disableWakeLock();
  }

  closeStoryViewer() {
    this.readingPageNumber.emit(this.currentPageIndex + 1);
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
      const texts = chapter.texts || [];
      const images = chapter.images || [];
      const paragraphs = [...texts]; // clone to avoid mutation
  
      let firstSlide = true;
      let imageIndex = 0;
  
      for (let i = 0; i < paragraphs.length; i += 2) {
        const textChunk = paragraphs.slice(i, i + 2);
        const image = imageIndex < images.length ? [images[imageIndex]] : [];
  
        slides.push({
          chapterTitle: firstSlide ? chapter.title : '',
          texts: textChunk,
          images: image,
          isFirstSlide: firstSlide
        });
  
        imageIndex++; // advance image only once per slide
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
