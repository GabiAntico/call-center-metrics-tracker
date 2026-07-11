import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from './core/services/auth/auth';

const canActivateDashboard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const session = await authService.getSession();
    return session ? true : router.createUrlTree(['/auth']);
  } catch {
    return router.createUrlTree(['/auth']);
  }
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth').then((m) => m.AuthComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/privacy/privacy').then((m) => m.PrivacyComponent),
  },
  {
    path: 'dashboard',
    canActivate: [canActivateDashboard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
