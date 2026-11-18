import { Routes } from '@angular/router';
import { DashboardShellComponent } from './shell.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', title: 'Overview · Blendy Studio', loadComponent: () => import('./overview.component').then((m) => m.OverviewComponent) },
      { path: 'users', title: 'Users · Blendy Studio', loadComponent: () => import('./users.component').then((m) => m.UsersComponent) },
      { path: 'users/:id', title: 'User · Blendy Studio', loadComponent: () => import('./user-detail.component').then((m) => m.UserDetailComponent) },
      { path: 'issues', title: 'Issues · Blendy Studio', loadComponent: () => import('./issues.component').then((m) => m.IssuesComponent) },
      { path: 'issues/:id', title: 'Issue · Blendy Studio', loadComponent: () => import('./issue-detail.component').then((m) => m.IssueDetailComponent) },
      { path: 'payments', title: 'Payments · Blendy Studio', loadComponent: () => import('./payments.component').then((m) => m.PaymentsComponent) },
      { path: 'plans', title: 'Plans · Blendy Studio', loadComponent: () => import('./plans.component').then((m) => m.PlansComponent) },
      { path: 'referrals', title: 'Referrals · Blendy Studio', loadComponent: () => import('./referrals.component').then((m) => m.ReferralsComponent) },
      { path: 'referrals/:id', title: 'Ambassador · Blendy Studio', loadComponent: () => import('./ambassador-detail.component').then((m) => m.AmbassadorDetailComponent) },
      { path: 'staff', title: 'Staff · Blendy Studio', loadComponent: () => import('./staff.component').then((m) => m.StaffComponent) },
      { path: 'subscriptions', title: 'Subscriptions · Blendy Studio', loadComponent: () => import('./subscriptions.component').then((m) => m.SubscriptionsComponent) },
    ],
  },
];
