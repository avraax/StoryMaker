// auto-redirect.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getAuth } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AutoRedirectGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}

    canActivate(): boolean {
        const storedUser = this.authService.currentUser;
        const firebaseUser = getAuth().currentUser;

        if (storedUser && firebaseUser) {
            this.authService.setUserFromStorage(storedUser);
            this.router.navigate(['/dashboard']);
        } else {
            this.router.navigate(['/login']);
        }

        return false;
    }
}
