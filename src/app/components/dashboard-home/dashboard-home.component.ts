import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard-home',
  imports: [],
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
