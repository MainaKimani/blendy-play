import { Routes } from '@angular/router';
import { adminGuard, signedInGuard, unverifiedGuard } from './core/guards';

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
    path: 'forgot-password',
    title: 'Reset your password · Blendy Play',
    loadComponent: () => import('./auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    title: 'Choose a new password · Blendy Play',
    loadComponent: () => import('./auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'verify',
    title: 'Confirm your email · Blendy Play',
    canActivate: [unverifiedGuard],
    loadComponent: () => import('./auth/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'account',
    canActivate: [signedInGuard],
    loadChildren: () => import('./account/account.routes').then((m) => m.ACCOUNT_ROUTES),
  },
  // The apps' "too many devices" message links here.
  { path: 'devices', redirectTo: 'account/devices' },
  {
    path: 'dashboard',
    canActivate: [adminGuard],
    loadChildren: () => import('./dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
