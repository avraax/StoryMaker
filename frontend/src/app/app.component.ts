import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: "app.component.html",
  imports: [
    MatProgressSpinnerModule,
    RouterModule
  ],
  styleUrls: ["app.component.scss"]
})
export class AppComponent {
  loading = true;

  constructor(private authService: AuthService) {
    this.authService.loading$.subscribe(isLoading => this.loading = isLoading);
  }
}
