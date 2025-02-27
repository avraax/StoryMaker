import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-story-dialog',
  standalone: true,
  imports: [
    CommonModule,
  ],
  template: `
    <h2>{{ data.story.topic }}</h2>
    <div *ngFor="let chapter of data.story.story; let i = index">
      <h3>{{chapter.title}}</h3>
      <p>{{ chapter.texts }}</p>
      <div *ngFor="let img of chapter.images">
        <img [src]="img" class="chapter-image" *ngIf="img">
      </div>
    </div>
    <button mat-button (click)="close()">Luk</button>
  `,
  styles: [`
    h2 {
      margin-top: 0;
    }
    .chapter-image {
      max-width: 100%;
      margin-top: 10px;
      border-radius: 8px;
    }
  `]
})
export class StoryDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<StoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  close() {
    this.dialogRef.close();
  }
}
