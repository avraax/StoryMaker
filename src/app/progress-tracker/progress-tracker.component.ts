import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-progress-tracker',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressBarModule],
  templateUrl: './progress-tracker.component.html',
  styleUrls: ['./progress-tracker.component.scss']
})
export class ProgressTrackerComponent {
  @Input() description: string |null = "udført";
  @Input() totalTasks: number = 0;
  @Input() completedTasks: number = 0;

  get progressPercentage(): number {
    if (this.totalTasks === 0) return 0;
    return (this.completedTasks / this.totalTasks) * 100;
  }
}
