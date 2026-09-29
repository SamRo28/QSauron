import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.css'
})
export class DashboardHomeComponent {
  createQuMuProject() {
    window.location.href = `${environment.quMuUrl}`;
  }

  createQuCoProject() {
    window.location.href = `${environment.quCoUrl}`;
  }

  createQuTeProject() {
    window.location.href = `${environment.quTeUrl}`;
  }
}
