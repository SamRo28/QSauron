import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { Fa2QrComponent } from './components/fa2-qr/fa2-qr.component';
import { Fa2Code } from './components/fa2-code/fa2-code.component';
import { authGuard } from './guards/auth.guard';
import { HomeComponent } from './components/home/home.component';
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home.component';
import { ProjectDetailsComponent } from './components/project-details/project-details.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardHomeComponent },
      { path: 'project/:id', component: ProjectDetailsComponent }
    ]
  },
  { path: '2fa-qr', component: Fa2QrComponent },
  { path: '2fa-code', component: Fa2Code },
  { path: '**', redirectTo: '' }
];
