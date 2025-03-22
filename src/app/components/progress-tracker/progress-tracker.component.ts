import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-progress-tracker',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressBarModule, MatIconModule],
  templateUrl: './progress-tracker.component.html',
  styleUrls: ['./progress-tracker.component.scss']
})
export class ProgressTrackerComponent {
  @Input() description: string | null = "";
  @Input() totalTasks: number = 0;
  @Input() completedTasks: number = 0;

  @Input() isCanceling: boolean = false;
  @Input() isCanceled: boolean = false;
  @Output() cancel = new EventEmitter<void>();

  get progressPercentage(): number {
    if (this.totalTasks === 0) return 0;
    return (this.completedTasks / this.totalTasks) * 100;
  }

  onCancelClick() {
    this.cancel.emit();
  }
}
