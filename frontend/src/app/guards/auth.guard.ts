import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getAuth } from 'firebase/auth';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        const storedUser = this.authService.currentUser;
        const firebaseUser = getAuth().currentUser;

        if (storedUser && firebaseUser) {
            return true;
        }

        this.router.navigate(['/login']);
        return false;
    }
}
