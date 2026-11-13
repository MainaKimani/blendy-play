import { Routes } from '@angular/router';
import { adminGuard, signedInGuard } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./site/home.component').then((m) => m.HomeComponent) },
  {
    path: 'signin',
    title: 'Sign in · Blendy Play',
    loadComponent: () => import('./auth/signin.component').then((m) => m.SigninComponent),
  },
  {
    path: 'admin',
    title: 'Admin sign-in · Blendy Play',
    data: { admin: true },
    loadComponent: () => import('./auth/signin.component').then((m) => m.SigninComponent),
  },
  {
    path: 'account',
    canActivate: [signedInGuard],
    loadChildren: () => import('./account/account.routes').then((m) => m.ACCOUNT_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [adminGuard],
    loadChildren: () => import('./dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
