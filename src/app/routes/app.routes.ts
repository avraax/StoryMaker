import { Routes } from '@angular/router';
import { AuthGuard } from '../guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('../components/redirect/redirect.component').then(m => m.RedirectComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('../components/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'dashboard',
        loadComponent: () => import('../components/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [AuthGuard]
    },
    { path: '**', redirectTo: 'login' }
];  