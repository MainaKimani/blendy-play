import { Routes } from '@angular/router';
import { AccountShellComponent } from './account-shell.component';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    component: AccountShellComponent,
    children: [
      { path: '', title: 'My account · Blendy Play', loadComponent: () => import('./details.component').then((m) => m.DetailsComponent) },
      { path: 'payments', title: 'My payments · Blendy Play', loadComponent: () => import('./payments.component').then((m) => m.MyPaymentsComponent) },
      { path: 'devices', title: 'Devices · Blendy Play', loadComponent: () => import('./devices.component').then((m) => m.DevicesComponent) },
      { path: 'security', title: 'Password and security · Blendy Play', loadComponent: () => import('./security.component').then((m) => m.SecurityComponent) },
    ],
  },
];
