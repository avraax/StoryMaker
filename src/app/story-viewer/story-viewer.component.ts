import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FireStoreStory } from '../models/firestore-story';
import { MatIconModule } from '@angular/material/icon';
import { StoryUtilsService } from '../services/story-utils.service';
import { BehaviorSubject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-story-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './story-viewer.component.html',
  styleUrls: ['./story-viewer.component.scss']
})
export class StoryViewerComponent implements OnInit {
  @Input() story = new BehaviorSubject<FireStoreStory | null>(null);
  storyObj: FireStoreStory | null | undefined;
  @Output() close = new EventEmitter<void>();
  @ViewChild('storyContent', { static: false }) storyContentRef!: ElementRef;

  constructor(public storyUtils: StoryUtilsService) { }

  ngOnInit() {
    this.story.subscribe((story) => {
      this.storyObj = story;
      if (this.storyObj) {
        document.body.style.overflow = 'hidden';
      }
      else {
        document.body.style.overflow = '';
      }
    })
  }

  closeStoryViewer() {
    document.body.style.overflow = '';
    this.close.emit();
  }

  exportToPDF() {
    if (this.storyContentRef?.nativeElement && this.storyObj) {
      this.storyUtils.exportToPDF(this.storyObj, this.storyContentRef.nativeElement);
    } else {
      console.error("storyContentRef is not yet available.");
    }
  }

  groupImages(images: string[], chunkSize: number): string[][] {
    const groupedImages: string[][] = [];
    for (let i = 0; i < images.length; i += chunkSize) {
      groupedImages.push(images.slice(i, i + chunkSize));
    }
    return groupedImages;
  }
}
