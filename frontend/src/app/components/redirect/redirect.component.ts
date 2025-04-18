import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { user } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  template: ``
})
export class RedirectComponent implements OnInit {

  constructor(private router: Router, private auth: Auth) {}

  async ngOnInit() {
    const currentUser = this.auth.currentUser ?? await firstValueFrom(user(this.auth));
    if (currentUser) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
